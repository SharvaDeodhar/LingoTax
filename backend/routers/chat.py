"""
Chat endpoint for multilingual RAG over tax documents.

POST /chat – Send a question, get a RAG-powered answer in the user's language
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from dependencies import get_current_user_id, get_user_supabase
from rag.retriever import retrieve_chunks
from rag.chain import answer_question

router = APIRouter()


class ChatRequest(BaseModel):
    document_id: str
    chat_id: str | None = None   # None = start a new chat session
    question: str
    language: str = "en"         # BCP-47 language code


class ChatResponse(BaseModel):
    chat_id: str
    answer: str
    sources: list


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    # 1. Verify document ownership
    doc = db.table("documents").select("id, ingest_status").eq("id", req.document_id).maybe_single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.data["ingest_status"] != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready for chat (status: {doc.data['ingest_status']})"
        )

    # 2. Get or create chat session
    if req.chat_id:
        chat_id = req.chat_id
    else:
        chat_result = (
            db.table("chats")
            .insert(
                {
                    "user_id": user_id,
                    "document_id": req.document_id,
                    "title": req.question[:80],
                }
            )
            .execute()
        )
        chat_id = chat_result.data[0]["id"]

    # 3. Store user message
    db.table("chat_messages").insert(
        {
            "chat_id": chat_id,
            "user_id": user_id,
            "role": "user",
            "content": req.question,
            "lang": req.language,
        }
    ).execute()

    # 4. Retrieve relevant chunks via pgvector
    chunks = retrieve_chunks(db, req.document_id, req.question)

    # 5. Generate answer with LangChain + Gemini
    answer = answer_question(
        question=req.question,
        chunks=chunks,
        language_code=req.language,
    )

    # 6. Build sources for citation display
    sources = [
        {
            "chunk_id": c["id"],
            "chunk_text": c["chunk_text"][:300],
            "page": c["metadata"].get("page"),
            "form_fields": c["metadata"].get("form_fields", {}),
            "similarity": round(c.get("similarity", 0), 3),
        }
        for c in chunks
    ]

    # 7. Store assistant message
    db.table("chat_messages").insert(
        {
            "chat_id": chat_id,
            "user_id": user_id,
            "role": "assistant",
            "content": answer,
            "lang": req.language,
            "sources": sources,
        }
    ).execute()

    return ChatResponse(chat_id=chat_id, answer=answer, sources=sources)
