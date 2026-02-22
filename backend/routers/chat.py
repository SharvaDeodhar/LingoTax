"""
Chat endpoint for multilingual RAG over tax documents.

POST /chat – Send a question, get a RAG-powered answer in the user's language.
  - With document_id: RAG over the uploaded document (must be ingest_status='ready')
  - Without document_id: General US tax question answered by Gemini with user profile context
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from dependencies import get_current_user_id, get_user_supabase
from rag.retriever import retrieve_all_chunks, retrieve_chunks
from rag.chain import answer_general_question, answer_question, summarize_document

router = APIRouter()


class ChatRequest(BaseModel):
    document_id: Optional[str] = None   # None = general tax help chat
    chat_id: Optional[str] = None       # None = start a new chat session
    question: str
    language: str = "en"                # BCP-47 language code


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
    # ── Document-specific RAG chat ────────────────────────────────────────────
    if req.document_id:
        # 1. Verify document ownership and readiness
        doc = (
            db.table("documents")
            .select("id, ingest_status")
            .eq("id", req.document_id)
            .maybe_single()
            .execute()
        )
        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc.data["ingest_status"] != "ready":
            raise HTTPException(
                status_code=400,
                detail=f"Document is not ready for chat (status: {doc.data['ingest_status']})",
            )

        # ── Auto-summarize: triggered by frontend on first open ───────────────
        if req.question == "__summarize__":
            # Get or create chat session (no user message stored for auto-summary)
            if req.chat_id:
                chat_id = req.chat_id
            else:
                chat_result = (
                    db.table("chats")
                    .insert(
                        {
                            "user_id": user_id,
                            "document_id": req.document_id,
                            "title": "Document Summary",
                        }
                    )
                    .execute()
                )
                chat_id = chat_result.data[0]["id"]

            all_chunks = retrieve_all_chunks(db, req.document_id)
            answer = summarize_document(all_chunks, language_code=req.language)

            db.table("chat_messages").insert(
                {
                    "chat_id": chat_id,
                    "user_id": user_id,
                    "role": "assistant",
                    "content": answer,
                    "lang": req.language,
                    "sources": [],
                }
            ).execute()

            return ChatResponse(chat_id=chat_id, answer=answer, sources=[])

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

        # 5. Generate answer with LangChain + Gemini RAG
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

    # ── General tax help chat (no document) ───────────────────────────────────
    # 1. Fetch questionnaire for personalization context
    q_res = (
        db.table("questionnaires")
        .select("residency_status, visa_type, income_sources, filing_status")
        .eq("user_id", user_id)
        .order("filing_year", desc=True)
        .limit(1)
        .execute()
    )
    questionnaire_context = ""
    if q_res.data:
        q = q_res.data[0]
        parts = []
        if q.get("residency_status"):
            parts.append(f"residency: {q['residency_status']}")
        if q.get("visa_type"):
            parts.append(f"visa: {q['visa_type']}")
        if q.get("filing_status"):
            parts.append(f"filing status: {q['filing_status']}")
        if q.get("income_sources"):
            parts.append(f"income sources: {', '.join(q['income_sources'])}")
        questionnaire_context = "; ".join(parts)

    # 2. Get or create a general chat session (document_id = null)
    if req.chat_id:
        chat_id = req.chat_id
    else:
        chat_result = (
            db.table("chats")
            .insert(
                {
                    "user_id": user_id,
                    "document_id": None,
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

    # 4. Generate answer (general knowledge, no retrieval)
    answer = answer_general_question(
        question=req.question,
        language_code=req.language,
        questionnaire_context=questionnaire_context,
    )

    # 5. Store assistant message (no sources for general chat)
    db.table("chat_messages").insert(
        {
            "chat_id": chat_id,
            "user_id": user_id,
            "role": "assistant",
            "content": answer,
            "lang": req.language,
            "sources": [],
        }
    ).execute()

    return ChatResponse(chat_id=chat_id, answer=answer, sources=[])
