-- ============================================================
-- Competitor Snapshots Migration — Phase 2 Watchdog
-- Stores historical metrics per competitor for trend detection
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  place_id TEXT,
  rating DECIMAL(3,2),
  review_count INTEGER,
  score INTEGER,
  rank_position INTEGER,
  alerts JSONB DEFAULT '[]'::jsonb,
  snapshot_source TEXT NOT NULL DEFAULT 'live', -- 'live' | 'stored'
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own competitor snapshots"
  ON competitor_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- One snapshot per competitor per day (upsert-friendly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitor_snapshots_unique_date
  ON competitor_snapshots(competitor_id, snapshot_date);

-- Fast lookups for history & trends
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_user_date
  ON competitor_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_competitor_date
  ON competitor_snapshots(competitor_id, snapshot_date DESC);
