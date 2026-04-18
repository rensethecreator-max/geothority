-- ============================================================
-- Scheduled Tasks Migration
-- Manages recurring jobs like competitor rescans.
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- e.g., 'competitor_rescan', 'gbp_monitor_scan'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  priority INTEGER DEFAULT 0, -- Higher number means higher priority
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  result TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled tasks" ON scheduled_tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_status_priority
  ON scheduled_tasks(user_id, status, priority DESC, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status_priority_schedule
  ON scheduled_tasks(status, priority DESC, scheduled_at);
