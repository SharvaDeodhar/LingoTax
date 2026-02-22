"""
Document management endpoints.

POST /documents/create       – Register a document after upload to Supabase Storage
POST /documents/{id}/ingest  – Trigger async ingestion pipeline (extract→chunk→embed→store)
GET  /documents              – List user's documents
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from supabase import Client

from dependencies import get_current_user_id, get_service_supabase, get_user_supabase
from services import pdf_service, storage_service
from rag import chunker, embedder, chain

router = APIRouter()


# ─── Request / Response models ────────────────────────────────────────────────

class CreateDocumentRequest(BaseModel):
    filename: str
    storage_path: str               # path already uploaded in tax-docs bucket
    mime_type: str = "application/pdf"
    file_size_bytes: int = 0
    filing_year: int = 2024
    task_id: Optional[str] = None   # optional link to a task that prompted this upload


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
    row: dict = {
        "user_id": user_id,
        "filename": req.filename,
        "storage_path": req.storage_path,
        "mime_type": req.mime_type,
        "file_size_bytes": req.file_size_bytes,
        "ingest_status": "pending",
        "filing_year": req.filing_year,
    }
    if req.task_id:
        row["task_id"] = req.task_id

    result = db.table("documents").insert(row).execute()
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


@router.get("/{document_id}/signed-url")
async def get_signed_url(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
    service_db: Client = Depends(get_service_supabase),
):
    """
    Return a temporary signed URL (1 hour) for reading the PDF in-browser.
    Ownership is verified through the RLS-enforced query.
    """
    doc = (
        db.table("documents")
        .select("storage_path")
        .eq("id", document_id)
        .maybe_single()
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Use service_db to bypass potential RLS issues on signed URL generation
        signed = storage_service.create_signed_url(
            service_db, doc.data["storage_path"], expires_in=3600
        )
        return {"signed_url": signed}
    except Exception as e:
        # If storage says "Object not found", return a clean 404
        if "Object not found" in str(e) or "400" in str(e):
            raise HTTPException(status_code=404, detail="PDF file missing from storage")
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")


@router.post("/{document_id}/save-pdf")
async def save_edited_pdf(
    document_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
    service_db: Client = Depends(get_service_supabase),
):
    """
    Overwrite the stored PDF with a user-edited version.
    After saving, re-triggers ingestion so RAG indexes reflect edits.
    """
    doc = db.table("documents").select("*").eq("id", document_id).maybe_single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = doc.data["storage_path"]
    file_bytes = await file.read()

    # Overwrite in Supabase Storage (service role)
    service_db.storage.from_("tax-docs").update(
        storage_path,
        file_bytes,
        {"content-type": "application/pdf", "upsert": "true"},
    )

    # Update file size + mark as pending/processing will happen in pipeline
    service_db.table("documents").update(
        {"file_size_bytes": len(file_bytes)}
    ).eq("id", document_id).execute()

    # Clear old chunks so indexes reflect edits
    service_db.table("document_chunks").delete().eq("document_id", document_id).execute()

    # Re-trigger ingestion pipeline
    background_tasks.add_task(
        _run_ingestion_pipeline,
        document_id=document_id,
        user_id=user_id,
        storage_path=storage_path,
        service_db=service_db,
    )

    return {"status": "saved_and_reingesting", "document_id": document_id}


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

        # 8. Post-ingestion: Auto-summarize
        await _auto_summarize_after_ingest(document_id, user_id, service_db)

    except Exception as exc:
        service_db.table("documents").update(
            {"ingest_status": "error", "error_message": str(exc)[:500]}
        ).eq("id", document_id).execute()


async def _auto_summarize_after_ingest(
    document_id: str,
    user_id: str,
    service_db: Client,
) -> None:
    """
    Check if an auto-summary exists; if not, generate and store it.
    This creates a chat session if one doesn't exist for this document.
    """
    try:
        # 1. Check for existing chat with this document
        chat_res = service_db.table("chats") \
            .select("id") \
            .eq("document_id", document_id) \
            .eq("user_id", user_id) \
            .maybe_single() \
            .execute()
        
        chat_id: Optional[str] = None
        if chat_res and chat_res.data:
            chat_id = chat_res.data["id"]
            
            # Check for existing auto-summary message
            msg_res = service_db.table("chat_messages") \
                .select("*") \
                .eq("chat_id", chat_id) \
                .execute()
            
            # Filter for auto_summary in memory to avoid 400/204 issues with JSONB filters
            existing_summary = next((m for m in (msg_res.data or []) if (m.get("metadata") or {}).get("auto_summary")), None)
            
            if existing_summary:
                # Already summarized
                return
        else:
            # Create new chat session for this document
            doc_res = service_db.table("documents").select("filename").eq("id", document_id).maybe_single().execute()
            title = doc_res.data["filename"] if (doc_res and doc_res.data) else "Document Chat"
            
            new_chat = service_db.table("chats").insert({
                "user_id": user_id,
                "document_id": document_id,
                "title": title
            }).execute()
            if not new_chat.data:
                return
            chat_id = new_chat.data[0]["id"]

        # 2. Fetch all chunks
        chunks_res = service_db.table("document_chunks") \
            .select("id, chunk_text, metadata") \
            .eq("document_id", document_id) \
            .order("chunk_index") \
            .execute()
        
        chunks = chunks_res.data or []
        if not chunks:
            return

        # 3. Generate summary
        summary = chain.summarize_document_sections(chunks=chunks, language_code="en")

        # 4. Build sources
        sources = [
            {
                "chunk_id": c["id"],
                "chunk_text": c["chunk_text"][:300],
                "page": c["metadata"].get("page"),
                "form_fields": c["metadata"].get("form_fields", {}),
                "similarity": 1.0,
            }
            for c in chunks[:5]
        ]

        # 5. Insert auto-summary message
        service_db.table("chat_messages").insert({
            "chat_id": chat_id,
            "user_id": user_id,
            "role": "assistant",
            "content": summary,
            "lang": "en",
            "sources": sources,
            "metadata": {"auto_summary": True}
        }).execute()

    except Exception as e:
        print(f"Error in _auto_summarize_after_ingest: {e}")