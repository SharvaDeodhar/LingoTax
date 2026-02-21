"""
Document management endpoints.

POST /documents/create       – Register a document after upload to Supabase Storage
POST /documents/{id}/ingest  – Trigger async ingestion pipeline (extract→chunk→embed→store)
GET  /documents              – List user's documents
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from dependencies import get_current_user_id, get_service_supabase, get_user_supabase
from services import pdf_service, storage_service
from rag import chunker, embedder

router = APIRouter()


# ─── Request / Response models ────────────────────────────────────────────────

class CreateDocumentRequest(BaseModel):
    filename: str
    storage_path: str       # path already uploaded in tax-docs bucket
    mime_type: str = "application/pdf"
    file_size_bytes: int = 0
    filing_year: int = 2024


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/create")
async def create_document(
    req: CreateDocumentRequest,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """
    Called by the frontend immediately after uploading a file to Supabase Storage.
    Creates the documents row with status='pending'.
    Returns the new document record.
    """
    result = (
        db.table("documents")
        .insert(
            {
                "user_id": user_id,
                "filename": req.filename,
                "storage_path": req.storage_path,
                "mime_type": req.mime_type,
                "file_size_bytes": req.file_size_bytes,
                "ingest_status": "pending",
                "filing_year": req.filing_year,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create document record")
    return result.data[0]


@router.post("/{document_id}/ingest")
async def ingest_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
    service_db: Client = Depends(get_service_supabase),
):
    """
    Triggers the async ingestion pipeline as a FastAPI BackgroundTask.
    Verifies ownership with the user-JWT client first, then hands off to
    the service-role client for the actual pipeline work.
    """
    # Verify ownership via RLS-enforced query
    doc = db.table("documents").select("*").eq("id", document_id).maybe_single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.data["ingest_status"] == "processing":
        return {"status": "already_processing", "document_id": document_id}

    background_tasks.add_task(
        _run_ingestion_pipeline,
        document_id=document_id,
        user_id=user_id,
        storage_path=doc.data["storage_path"],
        service_db=service_db,
    )
    return {"status": "ingestion_started", "document_id": document_id}


@router.get("")
async def list_documents(
    filing_year: int = 2024,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """Return all documents for the authenticated user, newest first."""
    result = (
        db.table("documents")
        .select("*")
        .eq("user_id", user_id)
        .eq("filing_year", filing_year)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


# ─── Background ingestion pipeline ───────────────────────────────────────────

async def _run_ingestion_pipeline(
    document_id: str,
    user_id: str,
    storage_path: str,
    service_db: Client,
) -> None:
    """
    Full pipeline:
      1. Set status → processing
      2. Download file bytes from Supabase Storage
      3. Extract text via pdfplumber
      4. Chunk with RecursiveCharacterTextSplitter
      5. Embed in batches of 100 (Gemini text-embedding-004)
      6. Insert document_chunks rows
      7. Set status → ready (or error on failure)
    """
    try:
        # 1. Mark as processing
        service_db.table("documents").update({"ingest_status": "processing"}).eq("id", document_id).execute()

        # 2. Download
        file_bytes = storage_service.download(service_db, storage_path)

        # 3. Extract pages
        pages = pdf_service.extract_pages(file_bytes)

        # 4. Chunk
        chunks = chunker.chunk_document(pages)
        if not chunks:
            raise ValueError("No text content extracted from document")

        # 5. Embed in batches of 100 (Gemini rate limit safe)
        texts = [c.text for c in chunks]
        all_embeddings: list = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            batch_embeddings = embedder.embed_texts(batch)
            all_embeddings.extend(batch_embeddings)

        # 6. Insert chunks
        rows = [
            {
                "document_id": document_id,
                "user_id": user_id,
                "chunk_index": chunks[i].index,
                "chunk_text": chunks[i].text,
                "embedding": all_embeddings[i],
                "metadata": chunks[i].metadata,
            }
            for i in range(len(chunks))
        ]
        service_db.table("document_chunks").insert(rows).execute()

        # 7. Mark as ready
        service_db.table("documents").update({"ingest_status": "ready"}).eq("id", document_id).execute()

    except Exception as exc:
        service_db.table("documents").update(
            {"ingest_status": "error", "error_message": str(exc)[:500]}
        ).eq("id", document_id).execute()
