-- task_groups: global reference table (Personal, Tax Forms, Work Forms, Other)
CREATE TABLE IF NOT EXISTS task_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- Seed default task groups
INSERT INTO task_groups (name, sort_order) VALUES
  ('Personal',   1),
  ('Tax Forms',  2),
  ('Work Forms', 3),
  ('Other',      4)
ON CONFLICT (name) DO NOTHING;

-- tasks: user-specific to-do items for a tax season
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  task_group_id UUID REFERENCES task_groups(id) ON DELETE SET NULL,

  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'done')
  ),
  filing_year   INT NOT NULL DEFAULT 2024,
  sort_order    INT NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_year ON tasks (user_id, filing_year);

DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
