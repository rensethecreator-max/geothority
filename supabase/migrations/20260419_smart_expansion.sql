-- Smart Expansion Layer tables (Phase 7)
-- Run: supabase db push or supabase migration up

-- Expansion targets: cities, services, niche directories identified for expansion
CREATE TABLE IF NOT EXISTS expansion_targets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('city', 'service', 'niche_directory')),
  name TEXT NOT NULL,
  state TEXT,
  slug TEXT NOT NULL,
  impact_score INTEGER NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'researching', 'ready', 'in_progress', 'completed', 'deprioritized')),
  rationale TEXT,
  signals JSONB DEFAULT '[]',
  suggested_actions JSONB DEFAULT '[]',
  estimated_traffic_lift INTEGER,
  estimated_revenue_impact INTEGER,
  competitor_presence JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expansion_targets_user ON expansion_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_expansion_targets_type ON expansion_targets(user_id, type);
CREATE INDEX IF NOT EXISTS idx_expansion_targets_status ON expansion_targets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expansion_targets_impact ON expansion_targets(user_id, impact_score DESC);

-- Expansion progress: tracks action completion per target
CREATE TABLE IF NOT EXISTS expansion_progress (
  target_id TEXT PRIMARY KEY REFERENCES expansion_targets(id) ON DELETE CASCADE,
  actions_completed INTEGER NOT NULL DEFAULT 0,
  actions_total INTEGER NOT NULL DEFAULT 0,
  completion_pct INTEGER NOT NULL DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  measurable_results JSONB DEFAULT '[]'
);

-- RLS
ALTER TABLE expansion_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expansion_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own expansion targets" ON expansion_targets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own expansion targets" ON expansion_targets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own expansion targets" ON expansion_targets
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own expansion targets" ON expansion_targets
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users see own expansion progress" ON expansion_progress
  FOR SELECT USING (
    target_id IN (SELECT id FROM expansion_targets WHERE user_id = auth.uid())
  );
CREATE POLICY "Users manage own expansion progress" ON expansion_progress
  FOR ALL USING (
    target_id IN (SELECT id FROM expansion_targets WHERE user_id = auth.uid())
  );
