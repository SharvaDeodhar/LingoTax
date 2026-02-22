-- Fix document–task relationship direction.
-- The previous migration (013) incorrectly added document_id to tasks.
-- The correct design: documents hold a task_id FK so one document belongs to one task.

-- 1. Add task_id to documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents (task_id);

-- 2. Remove the incorrect document_id column from tasks
ALTER TABLE tasks
  DROP COLUMN IF EXISTS document_id;
