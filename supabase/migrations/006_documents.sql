-- documents: metadata for uploaded tax documents (files live in Supabase Storage)
CREATE TABLE IF NOT EXISTS documents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  filename         TEXT NOT NULL,
  storage_path     TEXT NOT NULL,          -- path within tax-docs bucket: {user_id}/{ts}_{filename}
  mime_type        TEXT,
  file_size_bytes  BIGINT,

  ingest_status    TEXT NOT NULL DEFAULT 'pending' CHECK (
    ingest_status IN ('pending', 'processing', 'ready', 'error')
  ),
  error_message    TEXT,

  filing_year      INT NOT NULL DEFAULT 2024,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_year ON documents (user_id, filing_year);

DROP TRIGGER IF EXISTS trg_documents_updated ON documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- document_chunks: text chunks with pgvector embeddings
-- Dimension 768 matches Gemini text-embedding-004 output
CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  chunk_index  INT NOT NULL,
  chunk_text   TEXT NOT NULL,
  embedding    VECTOR(768),
  -- metadata: {"page": 1, "form_fields": {"Box 1": "50000"}}
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks (user_id);

-- IVFFlat index for approximate nearest-neighbor cosine similarity search.
-- NOTE: IVFFlat requires at least (lists * 40) rows to be effective.
-- For development with few rows, the sequential scan will be used automatically.
-- Run ANALYZE after loading data to let the planner pick the index.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
