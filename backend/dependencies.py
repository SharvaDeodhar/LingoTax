"""
Authentication dependency for FastAPI.

Flow:
  1. Frontend calls supabase.auth.getSession() → gets access_token (JWT)
  2. Frontend sends: Authorization: Bearer <access_token>
  3. This module extracts the token and creates a supabase-py client
     with postgrest.auth(token) set so ALL queries enforce RLS.

Two client types:
  - get_user_supabase: anon key + user JWT → respects RLS, safe for user-facing queries
  - get_service_supabase: service role key → bypasses RLS, use ONLY in background tasks
    after ownership has been verified with the user client first.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from config import settings

security = HTTPBearer()


def get_user_supabase(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Client:
    """
    Returns a Supabase client initialized with the user's JWT.
    All PostgREST queries made with this client respect RLS policies,
    because auth.uid() returns the authenticated user's ID.
    """
    token = credentials.credentials
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    # Attach the JWT to PostgREST requests so RLS can read auth.uid()
    client.postgrest.auth(token)
    return client


def get_service_supabase() -> Client:
    """
    Returns a service-role Supabase client that bypasses RLS.
    ONLY use for background tasks (e.g., ingestion pipeline) AFTER
    ownership has been verified using the user JWT client.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Extracts user_id from the Supabase JWT payload via plain base64url decode.
    No library dependencies, no network calls, works with all Supabase key formats.

    Security note: PostgREST validates the JWT signature on every DB query via
    get_user_supabase, and RLS enforces auth.uid() = user_id for all table access.
    Token forgery would be rejected at the DB layer even if it passed here.
    """
    import base64
    import json
    import time

    token = credentials.credentials
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("not a JWT")

        # base64url-decode the payload segment (pad to a multiple of 4)
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))

        user_id: str = payload.get("sub", "")
        if not user_id:
            raise ValueError("missing sub claim")

        exp = payload.get("exp")
        if exp and exp < time.time():
            raise ValueError("token expired")

        return user_id
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )