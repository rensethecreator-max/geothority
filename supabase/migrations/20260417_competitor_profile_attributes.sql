-- ============================================================
-- Competitor Profile Attributes — Enhanced Change Detection
-- Adds photo tracking, profile attribute tracking, and freshness indicators
-- to competitor_snapshots for the Autonomous Competitive Countermoves Engine
-- ============================================================

-- ── Photo tracking ──────────────────────────────────────────────
ALTER TABLE competitor_snapshots
  ADD COLUMN IF NOT EXISTS photo_count INTEGER,
  ADD COLUMN IF NOT EXISTS latest_photo_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_freshness_score SMALLINT;  -- 0-100: higher = more recent/fresh photos

-- ── Profile attribute snapshots (JSONB for flexible tracking) ──
ALTER TABLE competitor_snapshots
  ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb,        -- e.g. ["Insurance Agency","Financial Planner"]
  ADD COLUMN IF NOT EXISTS primary_category TEXT,
  ADD COLUMN IF NOT EXISTS hours_json JSONB,                             -- structured hours for diffing
  ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb,           -- service items list
  ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,                -- number of recent GBP posts detected
  ADD COLUMN IF NOT EXISTS has_description BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_website BOOLEAN,
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;         -- key-value GBP attributes

-- ── Index for attribute-change queries ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_competitor_date_attrs
  ON competitor_snapshots(competitor_id, snapshot_date DESC)
  INCLUDE (photo_count, primary_category, posts_count);

-- ── Competitor attribute change log ─────────────────────────────
CREATE TABLE IF NOT EXISTS competitor_attribute_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  snapshot_before UUID REFERENCES competitor_snapshots(id),
  snapshot_after UUID REFERENCES competitor_snapshots(id),
  change_type TEXT NOT NULL,         -- 'photo_count'|'category'|'hours'|'services'|'posts'|'description'|'website'|'attributes'
  change_label TEXT NOT NULL,        -- human-readable label
  change_detail JSONB NOT NULL,      -- {before, after, delta} structured data
  severity TEXT NOT NULL DEFAULT 'info',  -- 'info'|'warning'|'critical'
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competitor_attribute_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own competitor attribute changes"
  ON competitor_attribute_changes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_competitor_attr_changes_user_comp
  ON competitor_attribute_changes(user_id, competitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_attr_changes_type
  ON competitor_attribute_changes(change_type, created_at DESC);
