-- Tasks ←→ Documents linking + auto-generation metadata

-- Extend tasks table with source metadata for auto-generated vs manual tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'questionnaire'));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS questionnaire_id UUID
  REFERENCES questionnaires(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- task_documents: associates a checklist task with a specific uploaded document
CREATE TABLE IF NOT EXISTS task_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  task_id        UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Fine-grained document workflow state for this task
  status         TEXT NOT NULL DEFAULT 'uploaded'
                 CHECK (status IN ('not_started', 'uploaded', 'in_progress', 'completed')),

  -- JSON blob for saved progress/annotations (e.g. {"notes": "...", "fields": {...}})
  progress_data  JSONB NOT NULL DEFAULT '{}',

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (task_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_task_documents_user_id ON task_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_task_documents_task_id ON task_documents (task_id);
CREATE INDEX IF NOT EXISTS idx_task_documents_document_id ON task_documents (document_id);

DROP TRIGGER IF EXISTS trg_task_documents_updated ON task_documents;
CREATE TRIGGER trg_task_documents_updated
  BEFORE UPDATE ON task_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

