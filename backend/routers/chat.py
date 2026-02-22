"""
Chat endpoint for multilingual RAG over tax documents.

POST /chat – Send a question, get a RAG-powered answer in the user's language
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import json
import asyncio
from supabase import Client
from dependencies import get_current_user_id, get_user_supabase
from rag.retriever import retrieve_chunks
from rag.chain import answer_question, answer_general_tax_question, summarize_document_sections, stream_general_tax_question
from langchain_core.messages import HumanMessage, AIMessage

router = APIRouter()


class ChatRequest(BaseModel):
    document_id: str
    chat_id: Optional[str] = None  # None = start a new chat session
    question: str
    language: str = "en"  # BCP-47 language code


class ChatResponse(BaseModel):
    chat_id: str
    answer: str
    sources: list


class GeneralChatRequest(BaseModel):
    chat_id: Optional[str] = None  # None = start a new general chat session
    question: str
    language: str = "en"
    images: Optional[List[dict]] = None


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


@router.post("/general")
async def general_chat(
    req: GeneralChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """
    General tax help chatbot — now profile-aware.

    - Not tied to a specific document (chats.document_id is NULL)
    - Fetches user's questionnaire to provide personalized context
    - Respects the user's language preference via `language`
    - Persists conversation history in chats + chat_messages
    """
    # 1. Get or create chat session with document_id = NULL
    if req.chat_id:
        chat_res = (
            db.table("chats")
            .select("id, document_id")
            .eq("id", req.chat_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if not chat_res.data:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if chat_res.data.get("document_id") is not None:
            raise HTTPException(
                status_code=400,
                detail="Chat session is bound to a document; use the document chat endpoint instead.",
            )
        chat_id = chat_res.data["id"]
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

    # 2. Store user message
    db.table("chat_messages").insert(
        {
            "chat_id": chat_id,
            "user_id": user_id,
            "role": "user",
            "content": req.question,
            "lang": req.language,
        }
    ).execute()

    # 3. Build profile summary from questionnaire (if available)
    profile_summary = ""
    q_res = (
        db.table("questionnaires")
        .select("filing_status, residency_status, visa_type, income_sources, states_worked, has_ssn, has_itin, num_dependents, immigration_statuses")
        .eq("user_id", user_id)
        .order("filing_year", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    if q_res.data:
        q = q_res.data
        parts = []
        if q.get("filing_status"): parts.append(f"Filing status: {q['filing_status']}")
        if q.get("residency_status"): parts.append(f"Residency: {q['residency_status']}")
        if q.get("visa_type"): parts.append(f"Visa type: {q['visa_type']}")
        if q.get("income_sources"): parts.append(f"Income sources: {', '.join(q['income_sources'])}")
        if q.get("states_worked"): parts.append(f"States worked: {', '.join(q['states_worked'])}")
        if q.get("has_ssn"): parts.append("Has SSN")
        if q.get("has_itin"): parts.append("Has ITIN")
        if q.get("num_dependents", 0) > 0: parts.append(f"{q['num_dependents']} dependent(s)")
        if q.get("immigration_statuses"): parts.append(f"Immigration status: {', '.join(q['immigration_statuses'])}")
        if parts:
            profile_summary = "\n".join(parts)

    # 3.5 Fetch chat history
    chat_history = []
    if req.chat_id:
        history_res = (
            db.table("chat_messages")
            .select("role, content, created_at")
            .eq("chat_id", chat_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        for msg in reversed(history_res.data):
            if msg["role"] == "user":
                chat_history.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                chat_history.append(AIMessage(content=msg["content"]))

    # 4. Generate answer with streaming and profile context
    async def generate():
        # First chunk immediately sends back the chat_id in case it's new
        yield json.dumps({"chat_id": chat_id}) + "\n"
        
        full_answer = ""
        async for chunk in stream_general_tax_question(
            question=req.question,
            language_code=req.language,
            profile_summary=profile_summary,
            chat_history=chat_history,
            images=req.images,
        ):
            full_answer += chunk
            # Split the chunk into small tokens (e.g., words + spaces) to stream smoothly
            import re
            tokens = re.split(r'(\s+)', chunk)
            for token in tokens:
                if not token: continue
                yield json.dumps({"text": token}) + "\n"
                await asyncio.sleep(0.02) # Fast, smooth typewriter effect
            
        # 5. Store assistant message at the end
        db.table("chat_messages").insert(
            {
                "chat_id": chat_id,
                "user_id": user_id,
                "role": "assistant",
                "content": full_answer,
                "lang": req.language,
                "sources": [],
            }
        ).execute()

    return StreamingResponse(generate(), media_type="application/x-ndjson")


class SummarizeRequest(BaseModel):
    document_id: str
    language: str = "en"


@router.post("/summarize", response_model=ChatResponse)
async def summarize_document(
    req: SummarizeRequest,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """
    Produce a section-by-section summary of a document in the user's language.
    Uses ALL chunks for comprehensive coverage rather than top-k retrieval.
    Persists the summary as a chat message for future reference.
    """
    # 1. Verify document ownership and readiness
    doc = db.table("documents").select("id, ingest_status").eq("id", req.document_id).maybe_single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.data["ingest_status"] != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready (status: {doc.data['ingest_status']})"
        )

    # 2. Create or reuse a chat session for this document
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

    # 3. Fetch ALL chunks for the document (not just top-k)
    chunks_res = (
        db.table("document_chunks")
        .select("id, chunk_text, metadata")
        .eq("document_id", req.document_id)
        .order("chunk_index")
        .execute()
    )
    chunks = chunks_res.data or []

    # 4. Generate section-by-section summary
    summary = summarize_document_sections(
        chunks=chunks,
        language_code=req.language,
    )

    # 5. Build sources for citation
    sources = [
        {
            "chunk_id": c["id"],
            "chunk_text": c["chunk_text"][:300],
            "page": c["metadata"].get("page"),
            "form_fields": c["metadata"].get("form_fields", {}),
            "similarity": 1.0,
        }
        for c in chunks[:5]  # Limit citation display
    ]

    # 6. Store summary as assistant message
    db.table("chat_messages").insert(
        {
            "chat_id": chat_id,
            "user_id": user_id,
            "role": "assistant",
            "content": summary,
            "lang": req.language,
            "sources": sources,
        }
    ).execute()

    return ChatResponse(chat_id=chat_id, answer=summary, sources=sources)
