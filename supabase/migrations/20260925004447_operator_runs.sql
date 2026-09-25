-- Durable operator run log for coordinated launch decisions and execution history.

CREATE TABLE IF NOT EXISTS operator_runs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID,
  status TEXT NOT NULL CHECK (status IN ('blocked', 'ready', 'launched', 'resumed', 'failed')),
  operator_action TEXT NOT NULL,
  message TEXT NOT NULL,
  redirect_to TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_runs_user_created
  ON operator_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_runs_scan
  ON operator_runs(scan_id);

ALTER TABLE operator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own operator runs"
  ON operator_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own operator runs"
  ON operator_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own operator runs"
  ON operator_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
