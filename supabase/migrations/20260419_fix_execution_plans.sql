-- Persist Geothority fix engine execution plans so AUTO / ASSISTED / GUIDED
-- workflows survive process restarts and can be resumed safely.

CREATE TABLE IF NOT EXISTS fix_execution_plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('AUTO', 'ASSISTED', 'GUIDED')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  needs_input INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('planning', 'executing', 'paused', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fix_execution_plans_user_created
  ON fix_execution_plans(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fix_execution_plans_scan
  ON fix_execution_plans(scan_id);

ALTER TABLE fix_execution_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own fix execution plans"
  ON fix_execution_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own fix execution plans"
  ON fix_execution_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own fix execution plans"
  ON fix_execution_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
