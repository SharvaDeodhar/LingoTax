"""
pgvector retrieval via Supabase RPC.
Calls the match_chunks SQL function for cosine similarity search.
"""

from typing import List

from supabase import Client

from rag.embedder import embed_query


def retrieve_chunks(
    supabase: Client,
    document_id: str,
    query: str,
    top_k: int = 10,
    threshold: float = 0.40,
) -> List[dict]:
    """
    1. Embed the query with RETRIEVAL_QUERY task type.
    2. Call the match_chunks RPC (cosine similarity).
    3. Return ranked chunks: [{id, chunk_text, metadata, similarity}]

    Threshold calibrated for gemini-embedding-001 (lower scores than text-embedding-004).
    """
    query_embedding = embed_query(query)

    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "doc_id": document_id,
            "match_count": top_k,
            "match_threshold": threshold,
        },
    ).execute()

    return result.data or []


def retrieve_all_chunks(
    supabase: Client,
    document_id: str,
) -> List[dict]:
    """
    Fetch ALL chunks for a document ordered by chunk_index.
    Used for document summarization — no similarity filtering, no embedding needed.
    Returns [{id, chunk_text, metadata, chunk_index}]
    """
    result = (
        supabase.table("document_chunks")
        .select("id, chunk_text, metadata, chunk_index")
        .eq("document_id", document_id)
        .order("chunk_index", desc=False)
        .execute()
    )
    return result.data or []
