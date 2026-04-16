-- ============================================================
-- GBP Monitor + Score History Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── GBP Monitors ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gbp_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  place_id TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  last_scanned TIMESTAMPTZ,
  scan_frequency TEXT NOT NULL DEFAULT 'weekly',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gbp_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own GBP monitors"
  ON gbp_monitors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── GBP Monitor Snapshots ────────────────────────────────────

CREATE TABLE IF NOT EXISTS gbp_monitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES gbp_monitors(id) ON DELETE CASCADE,
  rating DECIMAL(3,2),
  review_count INTEGER,
  competitor_data JSONB,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gbp_monitor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own GBP snapshots via monitor"
  ON gbp_monitor_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gbp_monitors
      WHERE gbp_monitors.id = gbp_monitor_snapshots.monitor_id
        AND gbp_monitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role inserts GBP snapshots"
  ON gbp_monitor_snapshots FOR INSERT
  WITH CHECK (true);

-- ── GBP Alerts ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gbp_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES gbp_monitors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,  -- 'rating_drop', 'new_reviews', 'competitor_change'
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gbp_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own GBP alerts"
  ON gbp_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gbp_alerts_user_id ON gbp_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_gbp_alerts_monitor_id ON gbp_alerts(monitor_id);
CREATE INDEX IF NOT EXISTS idx_gbp_monitors_user_id ON gbp_monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_gbp_monitor_snapshots_monitor_id ON gbp_monitor_snapshots(monitor_id);

-- ── Score History ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  overall_score INTEGER NOT NULL,
  layer_scores JSONB,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own score history"
  ON score_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_score_history_user_id ON score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_score_history_scanned_at ON score_history(user_id, scanned_at DESC);
