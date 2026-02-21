"""
Supabase Storage helpers for the ingestion pipeline.
Uses the service-role client to download files (bypasses signed URL requirement).
"""

from supabase import Client


def download(client: Client, storage_path: str, bucket: str = "tax-docs") -> bytes:
    """
    Download a file from Supabase Storage and return its raw bytes.
    storage_path: path within the bucket, e.g. "user_id/1234567890_W2.pdf"
    """
    response = client.storage.from_(bucket).download(storage_path)
    return response


def create_signed_url(client: Client, storage_path: str, expires_in: int = 3600, bucket: str = "tax-docs") -> str:
    """
    Generate a signed URL for temporary read access to a file.
    expires_in: seconds until expiry (default 1 hour)
    """
    response = client.storage.from_(bucket).create_signed_url(storage_path, expires_in)
    return response["signedURL"]
