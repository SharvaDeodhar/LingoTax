-- Add form_code and auto_generated columns to tasks
-- form_code links a task to a specific tax form (e.g., "W-2", "1099-NEC")
-- auto_generated distinguishes AI-generated tasks from user-created ones

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS form_code      TEXT,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_form_code      ON tasks (form_code);
CREATE INDEX IF NOT EXISTS idx_tasks_auto_generated ON tasks (auto_generated);

-- Add task_id to documents so a document can be linked back to the task it belongs to
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents (task_id);
