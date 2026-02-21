"""
PDF text extraction using pdfplumber.
Extracts text and table key-value pairs per page.
"""

import io
from typing import List

import pdfplumber


def extract_pages(file_bytes: bytes) -> List[dict]:
    """
    Extract text and structured fields from each page of a PDF.

    Returns a list of dicts:
      [
        {
          "page": 1,
          "text": "full extracted text...",
          "fields": {"Box 1": "50000.00", "Box 2": "8000.00"}
        },
        ...
      ]

    For tax forms, pdfplumber often extracts labeled fields from tables.
    The "fields" dict is best-effort; text extraction is always available.
    """
    pages = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            tables = page.extract_tables() or []

            # Attempt to extract key-value pairs from tables
            fields: dict = {}
            for table in tables:
                for row in table:
                    if not row:
                        continue
                    # Look for rows with exactly 2 non-empty cells (label: value)
                    non_empty = [str(cell).strip() for cell in row if cell and str(cell).strip()]
                    if len(non_empty) == 2:
                        fields[non_empty[0]] = non_empty[1]
                    # Also handle wider rows where col 0 is label, col 1 is value
                    elif len(row) >= 2 and row[0] and row[1]:
                        key = str(row[0]).strip()
                        val = str(row[1]).strip()
                        if key and val:
                            fields[key] = val

            pages.append(
                {
                    "page": i + 1,
                    "text": text,
                    "fields": fields,
                }
            )

    return pages
