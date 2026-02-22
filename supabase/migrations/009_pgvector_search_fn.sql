-- Make the vector type visible (pgvector lives in the extensions schema on Supabase)
SET search_path TO public, extensions;

-- match_chunks: cosine similarity search for RAG retrieval
-- Called as RPC from FastAPI backend:
--   supabase.rpc("match_chunks", { query_embedding: [...], doc_id: "uuid", match_count: 5, match_threshold: 0.70 })
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding  VECTOR(768),
  doc_id           UUID,
  match_count      INT     DEFAULT 5,
  match_threshold  FLOAT   DEFAULT 0.70
)
RETURNS TABLE (
  id          UUID,
  chunk_text  TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT
    dc.id,
    dc.chunk_text,
    dc.metadata,
    1.0 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE
    dc.document_id = doc_id
    AND 1.0 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
