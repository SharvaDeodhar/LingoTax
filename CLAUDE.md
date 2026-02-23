# CLAUDE.md — LinguaTax

Multilingual US tax assistant. Next.js 14 frontend + FastAPI backend + Supabase (Postgres/pgvector/Auth/Storage) + Google Gemini 2.5 Flash.

## Quick Start

```bash
# Install dependencies
make install          # installs both backend venv + frontend npm

# Run both services
make dev              # backend on :8000, frontend on :3000

# Individual services
make dev-backend      # uvicorn --reload on :8000
make dev-frontend     # next dev on :3000
```

Backend API docs available at http://localhost:8000/docs (Swagger UI).

## Environment Setup

Copy env files before running:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — frontend Supabase
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — backend Supabase
- `GEMINI_API_KEY` — Google Generative AI key (Gemini 2.5 Flash)
- `NEXT_PUBLIC_FASTAPI_URL` — backend URL seen by browser (default: http://localhost:8000)

## Frontend

- **Stack**: Next.js 14, React 18, TypeScript, Tailwind CSS 3, Shadcn/Radix UI
- **Path alias**: `@/*` → `src/*`
- **Auth**: Supabase SSR — session validated server-side in `src/middleware.ts`
- **API calls**: `src/lib/api/fastapi.ts` (typed wrappers; all include JWT Bearer header)
- **Lint**: `cd frontend && npm run lint` (ESLint next/core-web-vitals)
- **Build**: `cd frontend && npm run build` then `npm run start`

Route groups:
- `(auth)/` — unauthenticated: login, signup, OTP, password reset
- `(app)/` — protected: dashboard, files, tasks, profile, settings, help

## Backend

- **Stack**: FastAPI 0.115, Python 3.12, LangChain 0.3, pdfplumber
- **Virtual env**: `.venv/` at repo root (`source .venv/bin/activate`)
- **Routers**: `/documents`, `/chat`, `/tasks` (see `backend/routers/`)
- **RAG pipeline**: `backend/rag/` — chain → chunker → embedder → retriever
- **LLM**: `gemini-2.5-flash` via LangChain Google GenAI
- **Embeddings**: `gemini-embedding-001` (768-dim) via `backend/rag/embedder.py`
- **Streaming**: NDJSON events — `meta`, `sources`, `plan_token`, `answer_token`, `done`

macOS extra dep: `brew install poppler` (required by pdfplumber for table extraction).

## Database (Supabase)

- **Migrations**: `supabase/migrations/` — run via Supabase CLI
- **RLS**: All user tables enforce `auth.uid() = user_id`
- **Vector search**: `match_chunks()` RPC in pgvector (cosine similarity, threshold 0.40)
- **Storage**: PDFs in Supabase Storage bucket, accessed via signed URLs

## Key Files Reference

| Purpose | Path |
|---|---|
| FastAPI entry | `backend/main.py` |
| Env config | `backend/config.py` |
| Auth & DI | `backend/dependencies.py` |
| RAG chain (LLM prompts) | `backend/rag/chain.py` |
| Embedding | `backend/rag/embedder.py` |
| Vector retrieval | `backend/rag/retriever.py` |
| Chunk strategy | `backend/rag/chunker.py` |
| PDF extraction | `backend/services/pdf_service.py` |
| Storage helpers | `backend/services/storage_service.py` |
| Typed API client | `frontend/src/lib/api/fastapi.ts` |
| All TS types | `frontend/src/types/index.ts` |
| Constants (languages, year) | `frontend/src/lib/constants.ts` |
| Route protection | `frontend/src/middleware.ts` |
| Supabase server client | `frontend/src/lib/supabase/server.ts` |
| Supabase browser client | `frontend/src/lib/supabase/client.ts` |

## Supported Languages (18)

English, Spanish, Simplified Chinese, Traditional Chinese, Hindi, Korean, Vietnamese, Portuguese (BR), Arabic, Filipino, Bengali, Gujarati, Punjabi, Tamil, Telugu, Urdu, Japanese, French, German.

Language codes: `frontend/src/lib/constants.ts`. Backend language→name map: `backend/rag/chain.py`.

## Architecture Overview

```
Browser (Next.js 14 + TypeScript)
    ↕  REST / NDJSON streaming
FastAPI backend (Python 3.12, LangChain, Gemini 2.5 Flash)
    ↕  supabase-py / PostgREST
Supabase (Postgres + pgvector + Auth + Storage)
```

Auth flow: Supabase JWT → `Authorization: Bearer <token>` header → `get_current_user_id()` decodes JWT payload → user-scoped Supabase client enforces RLS on all queries.

Ingestion pipeline (async background task): upload to Storage → `POST /documents/create` → `POST /documents/{id}/ingest` → download → pdfplumber extract → chunk (800 chars, 150 overlap) → embed (gemini-embedding-001) → insert into `document_chunks` → auto-summarize.

RAG chat flow: embed query → pgvector similarity search (top-10, threshold 0.40) → deduplicate sources (max 3) → Gemini 2.5 Flash stream → NDJSON to browser.

## Known Gaps / Watch-outs

- **No test suite** — no pytest in backend, no Jest in frontend. Add tests before major refactors.
- **CORS is `allow_origins=["*"]`** in `backend/main.py` — restrict to `FRONTEND_URL` in production.
- **Filing year hardcoded** as `2024` in `frontend/src/lib/constants.ts`.
- **Ingestion has no retry** — `BackgroundTask` failures can leave documents stuck at `processing`.
- **JWT decode-only** in `backend/dependencies.py` — no signature verification; relies on Supabase RLS.
- **`get_service_supabase()` bypasses RLS** — only use after explicit ownership verification.
- **poppler required** on macOS for pdfplumber — `brew install poppler`.
