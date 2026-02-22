-- Row Level Security for task_documents

ALTER TABLE task_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_documents_all_own" ON task_documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

