"""
Text chunking for the RAG ingestion pipeline.
Uses RecursiveCharacterTextSplitter with overlap to preserve context.
"""

from dataclasses import dataclass
from typing import List

from langchain.text_splitter import RecursiveCharacterTextSplitter


@dataclass
class Chunk:
    text: str
    index: int
    metadata: dict  # {"page": 1, "form_fields": {"Box 1": "50000"}}


def chunk_document(
    pages: List[dict],
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> List[Chunk]:
    """
    Split extracted page text into overlapping chunks.

    pages: output from pdf_service.extract_pages()
    chunk_size: target character length per chunk
    chunk_overlap: characters of overlap between consecutive chunks

    Returns an ordered list of Chunk objects with index and page metadata.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: List[Chunk] = []
    index = 0

    for page in pages:
        text = page.get("text", "").strip()
        if not text:
            continue

        splits = splitter.split_text(text)
        for split_text in splits:
            chunks.append(
                Chunk(
                    text=split_text,
                    index=index,
                    metadata={
                        "page": page["page"],
                        "form_fields": page.get("fields", {}),
                    },
                )
            )
            index += 1

    return chunks
