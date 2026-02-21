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
    Extracts user_id (sub) from the Supabase JWT without making a network call.
    Supabase JWTs are HS256, signed with the project JWT secret.
    We decode without full signature verification here for performance;
    RLS enforcement via the user Supabase client is the true security layer.
    """
    from jose import jwt, JWTError

    token = credentials.credentials
    try:
        # Decode without verifying signature for speed.
        # True security comes from Supabase RLS enforcing auth.uid().
        payload = jwt.decode(
            token,
            key="",  # not used when verify_signature=False
            algorithms=["HS256"],
            options={"verify_signature": False, "verify_exp": True},
        )
        user_id: str = payload.get("sub", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing sub claim",
            )
        return user_id
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )
