-- Row Level Security: every user can only access their own data
-- task_groups and forms_catalog are global reference tables — read-only, no RLS needed

-- ─── Enable RLS ────────────────────────────────────────────────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_form_checklist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages         ENABLE ROW LEVEL SECURITY;

-- ─── profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── questionnaires ────────────────────────────────────────────────────────────
CREATE POLICY "questionnaires_all_own" ON questionnaires
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── tasks ─────────────────────────────────────────────────────────────────────
CREATE POLICY "tasks_all_own" ON tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- task_groups: global reference, anyone can read
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_groups_select_all" ON task_groups
  FOR SELECT USING (true);

-- forms_catalog: global reference, anyone can read
ALTER TABLE forms_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_catalog_select_all" ON forms_catalog
  FOR SELECT USING (true);

-- ─── user_form_checklist ───────────────────────────────────────────────────────
CREATE POLICY "user_form_checklist_all_own" ON user_form_checklist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── documents ─────────────────────────────────────────────────────────────────
CREATE POLICY "documents_all_own" ON documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── document_chunks ───────────────────────────────────────────────────────────
-- Access via user_id column (denormalized for RLS efficiency)
CREATE POLICY "document_chunks_all_own" ON document_chunks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── chats ─────────────────────────────────────────────────────────────────────
CREATE POLICY "chats_all_own" ON chats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── chat_messages ─────────────────────────────────────────────────────────────
CREATE POLICY "chat_messages_all_own" ON chat_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
