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
    top_k: int = 5,
    threshold: float = 0.70,
) -> List[dict]:
    """
    1. Embed the query with RETRIEVAL_QUERY task type.
    2. Call the match_chunks RPC (cosine similarity).
    3. Return ranked chunks: [{id, chunk_text, metadata, similarity}]
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
