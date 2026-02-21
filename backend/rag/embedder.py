"""
Embedding generation using Gemini text-embedding-004 (768 dimensions).
Supports batch embedding for ingestion and single query embedding for retrieval.
"""

from typing import List

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential

from config import settings

genai.configure(api_key=settings.gemini_api_key)

_EMBEDDING_MODEL = "models/text-embedding-004"
_OUTPUT_DIM = 768


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a batch of document chunks.
    Use task_type=RETRIEVAL_DOCUMENT during ingestion.
    Gemini allows up to 100 texts per batch call.
    """
    result = genai.embed_content(
        model=_EMBEDDING_MODEL,
        content=texts,
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=_OUTPUT_DIM,
    )
    # result["embedding"] is a list of vectors when content is a list
    return result["embedding"]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def embed_query(text: str) -> List[float]:
    """
    Embed a single user query.
    Use task_type=RETRIEVAL_QUERY for better retrieval accuracy.
    """
    result = genai.embed_content(
        model=_EMBEDDING_MODEL,
        content=text,
        task_type="RETRIEVAL_QUERY",
        output_dimensionality=_OUTPUT_DIM,
    )
    return result["embedding"]
