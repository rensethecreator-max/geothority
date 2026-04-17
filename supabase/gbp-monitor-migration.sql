-- ============================================================
-- GBP Monitor Tables — Run in Supabase SQL Editor
-- Used by /api/cron/gbp-monitor and /api/gbp/monitor
-- ============================================================

-- GBP Monitors
CREATE TABLE IF NOT EXISTS gbp_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  place_id TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  scan_frequency TEXT DEFAULT 'weekly' CHECK (scan_frequency IN ('daily', 'weekly', 'monthly')),
  active BOOLEAN DEFAULT true,
  last_scanned TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GBP Monitor Snapshots
CREATE TABLE IF NOT EXISTS gbp_monitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES gbp_monitors(id) ON DELETE CASCADE NOT NULL,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  competitor_data JSONB,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- GBP Alerts
CREATE TABLE IF NOT EXISTS gbp_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES gbp_monitors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gbp_monitors_user_id ON gbp_monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_gbp_monitors_active ON gbp_monitors(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gbp_monitor_snapshots_monitor_id ON gbp_monitor_snapshots(monitor_id);
CREATE INDEX IF NOT EXISTS idx_gbp_monitor_snapshots_scanned_at ON gbp_monitor_snapshots(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_gbp_alerts_monitor_id ON gbp_alerts(monitor_id);
CREATE INDEX IF NOT EXISTS idx_gbp_alerts_user_id ON gbp_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_gbp_alerts_read ON gbp_alerts(read) WHERE read = false;

-- RLS
ALTER TABLE gbp_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_monitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own monitors" ON gbp_monitors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access monitors" ON gbp_monitors FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own snapshots" ON gbp_monitor_snapshots FOR SELECT
  USING (monitor_id IN (SELECT id FROM gbp_monitors WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access snapshots" ON gbp_monitor_snapshots FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own alerts" ON gbp_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON gbp_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access alerts" ON gbp_alerts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
