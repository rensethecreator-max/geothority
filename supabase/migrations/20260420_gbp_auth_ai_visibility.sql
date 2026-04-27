-- ============================================================
-- GBP Auth Durability + AI Visibility Intelligence (Epics 3, 10-12)
-- ============================================================

-- ── GBP Connection Health ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS gbp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Connection state
  connected_at TIMESTAMPTZ,
  last_refresh_attempt TIMESTAMPTZ,
  last_successful_refresh TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,
  refresh_token_present BOOLEAN DEFAULT FALSE,
  -- Health status
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'expired', 'refresh_failed', 'disconnected', 'reconnecting')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  -- Profile info (cached)
  account_name TEXT,
  location_name TEXT,
  account_id TEXT,  -- Google account ID
  location_id TEXT, -- Google location ID
  -- Health check metadata
  last_health_check TIMESTAMPTZ,
  next_health_check TIMESTAMPTZ,
  health_score SMALLINT CHECK (health_score >= 0 AND health_score <= 100),
  -- Reconnect prompt
  needs_reconnect BOOLEAN DEFAULT FALSE,
  reconnect_prompted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gbp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own GBP connections"
  ON gbp_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── GBP Connection Event Log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS gbp_connection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'connect' | 'disconnect' | 'refresh_success' | 'refresh_failure' | 'token_expired' | 'reconnect_prompt'
  event_detail TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gbp_connection_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own GBP connection events"
  ON gbp_connection_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gbp_conn_events_user
  ON gbp_connection_events(user_id, created_at DESC);

-- ── AI Visibility Query Sets ────────────────────────────────────
-- Manage the queries used to check AI visibility
CREATE TABLE IF NOT EXISTS ai_query_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- e.g. "Insurance Agent Queries"
  vertical TEXT,       -- e.g. "insurance", "dental", "legal"
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  -- Query list
  queries JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{query: "best insurance agent tampa", priority: 1}, ...]
  is_default BOOLEAN DEFAULT FALSE,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_query_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AI query sets"
  ON ai_query_sets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── AI Visibility Check Results ────────────────────────────────
-- Persistent snapshots of AI visibility per query per engine
CREATE TABLE IF NOT EXISTS ai_visibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_set_id UUID REFERENCES ai_query_sets(id) ON DELETE CASCADE,
  -- Query context
  query TEXT NOT NULL,
  city TEXT NOT NULL,
  vertical TEXT,
  business_name TEXT NOT NULL,
  -- Per-engine results
  engine TEXT NOT NULL,  -- 'google_ai' | 'chatgpt' | 'perplexity' | 'claude' | 'gemini'
  found BOOLEAN NOT NULL DEFAULT FALSE,
  mentioned_text TEXT,
  snippet TEXT,
  confidence TEXT NOT NULL DEFAULT 'none' CHECK (confidence IN ('high', 'medium', 'low', 'none')),
  is_real BOOLEAN DEFAULT FALSE,  -- true if actual API call, false if simulated
  competitors JSONB DEFAULT '[]'::jsonb,  -- [{name, mentioned}]
  -- Snapshot metadata
  check_source TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'cron' | 'scheduled'
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_visibility_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AI visibility checks"
  ON ai_visibility_checks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_vis_checks_user_date
  ON ai_visibility_checks(user_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_vis_checks_user_engine
  ON ai_visibility_checks(user_id, engine, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_vis_checks_user_query
  ON ai_visibility_checks(user_id, query, checked_at DESC);

-- ── AI Visibility Scorecard ────────────────────────────────────
-- Aggregated scores per user, recomputed on each check run
CREATE TABLE IF NOT EXISTS ai_visibility_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Overall score
  overall_score SMALLINT NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_visibility TEXT NOT NULL DEFAULT 'none' CHECK (overall_visibility IN ('high', 'medium', 'low', 'none')),
  -- Per-engine scores
  google_ai_score SMALLINT DEFAULT 0,
  chatgpt_score SMALLINT DEFAULT 0,
  perplexity_score SMALLINT DEFAULT 0,
  claude_score SMALLINT DEFAULT 0,
  gemini_score SMALLINT DEFAULT 0,
  -- Trend
  previous_overall_score SMALLINT,
  score_delta INTEGER,
  -- Query coverage
  total_queries INTEGER DEFAULT 0,
  found_queries INTEGER DEFAULT 0,
  -- Gap analysis
  gap_analysis JSONB DEFAULT '{}'::jsonb,  -- {engine: {missingTopics, recommendations}}
  top_recommendations JSONB DEFAULT '[]'::jsonb,
  -- Metadata
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Normalize shape when an earlier migration created a smaller ai_visibility_scorecards table.
ALTER TABLE ai_visibility_scorecards
  ADD COLUMN IF NOT EXISTS overall_visibility TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS google_ai_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chatgpt_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perplexity_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claude_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gemini_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_queries INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS found_queries INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gap_analysis JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS top_recommendations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_computed_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE ai_visibility_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AI visibility scorecard"
  ON ai_visibility_scorecards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── AI Content Adaptation Recommendations ──────────────────────
-- Generated from gap analysis — what content to create next
CREATE TABLE IF NOT EXISTS ai_content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scorecard_id UUID REFERENCES ai_visibility_scorecards(id) ON DELETE CASCADE,
  -- Recommendation
  recommendation_type TEXT NOT NULL,  -- 'faq_page' | 'local_page' | 'schema' | 'citation' | 'trust_content' | 'entity_page'
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 50,  -- higher = more important
  impact_estimate TEXT,  -- 'high' | 'medium' | 'low'
  target_engine TEXT,    -- which AI engine this helps most
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  content_id UUID,      -- FK to generated_content once created
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_content_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AI content recommendations"
  ON ai_content_recommendations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_content_recs_user_status
  ON ai_content_recommendations(user_id, status, priority DESC);
