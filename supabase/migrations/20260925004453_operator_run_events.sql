ALTER TABLE operator_runs
  ADD COLUMN IF NOT EXISTS current_stage TEXT NOT NULL DEFAULT 'intake',
  ADD COLUMN IF NOT EXISTS stage_status TEXT NOT NULL DEFAULT 'started',
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS operator_run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES operator_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'blocked', 'redirected', 'failed', 'info')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_run_events_run_created
  ON operator_run_events(run_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_operator_run_events_user_created
  ON operator_run_events(user_id, created_at DESC);

ALTER TABLE operator_run_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own operator run events"
  ON operator_run_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own operator run events"
  ON operator_run_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
