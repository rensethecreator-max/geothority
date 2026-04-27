-- ============================================================
-- Phase 5-8 Completion: NAP Push, Aggregator Persistence, Expansion Actions, Public API
-- ============================================================

-- ── Aggregator Sync Jobs (persistent, replaces in-memory store) ──
CREATE TABLE IF NOT EXISTS aggregator_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('semrush', 'vendasta', 'yext')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  business_data JSONB NOT NULL,
  result JSONB,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aggregator_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync jobs"
  ON aggregator_sync_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_agg_sync_jobs_user
  ON aggregator_sync_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agg_sync_jobs_status
  ON aggregator_sync_jobs(status, provider);

-- ── Aggregator Sync Job Logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS aggregator_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES aggregator_sync_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aggregator_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync logs"
  ON aggregator_sync_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── NAP Push Batch Jobs (Phase 5) ─────────────────────────────
-- Track batch NAP push operations across multiple directories
CREATE TABLE IF NOT EXISTS nap_push_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_nap_hash TEXT NOT NULL,
  business_data JSONB NOT NULL,
  -- Targets
  total_directories INTEGER NOT NULL DEFAULT 0,
  pushed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'partial', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nap_push_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own NAP push batches"
  ON nap_push_batches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── NAP Push Directory Results ────────────────────────────────
CREATE TABLE IF NOT EXISTS nap_push_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES nap_push_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  directory_id TEXT REFERENCES citation_directories(id),
  directory_name TEXT NOT NULL,
  sync_mode TEXT NOT NULL,  -- 'direct' | 'distribution' | 'guided' | 'unknown'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pushed', 'failed', 'skipped', 'guided')),
  result_detail TEXT,
  url TEXT,  -- listing URL after push
  pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nap_push_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own NAP push results"
  ON nap_push_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nap_push_results_batch
  ON nap_push_results(batch_id);

-- ── Expansion Action Log (Phase 7) ────────────────────────────
-- Track auto-executed expansion actions with results
CREATE TABLE IF NOT EXISTS expansion_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID,  -- FK to expansion_targets
  action_type TEXT NOT NULL,  -- 'create_page' | 'claim_listing' | 'add_service' | 'build_citation'
  action_detail JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  result TEXT,
  content_id UUID,  -- FK to generated_content if a page was created
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expansion_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expansion action log"
  ON expansion_action_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_expansion_action_log_user
  ON expansion_action_log(user_id, created_at DESC);

-- ── Public Business API Keys (Phase 6) ────────────────────────
-- API keys for external access to business data
CREATE TABLE IF NOT EXISTS public_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,  -- first 8 chars for identification
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,  -- ["read", "write"]
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own API keys"
  ON public_api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Public Business Profile View (Phase 6) ────────────────────
-- Materialized view for fast public reads
CREATE OR REPLACE VIEW public_business_profiles AS
SELECT
  bp.id,
  bp.business_name,
  bp.address,
  bp.city,
  bp.state,
  bp.zip,
  bp.phone,
  bp.website,
  bp.nap_hash,
  bp.identity_confidence,
  up.business_name as user_business_name,
  bp.updated_at
FROM business_profiles bp
JOIN user_profiles up ON bp.user_id = up.id
WHERE bp.identity_confidence IS NOT NULL;

-- ── Trust Signal Aggregation (Phase 5) ────────────────────────
CREATE TABLE IF NOT EXISTS trust_signal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Signal scores (0-100)
  nap_consistency INTEGER NOT NULL DEFAULT 0,
  citation_coverage INTEGER NOT NULL DEFAULT 0,
  review_velocity INTEGER NOT NULL DEFAULT 0,
  review_rating INTEGER NOT NULL DEFAULT 0,
  gbp_completeness INTEGER NOT NULL DEFAULT 0,
  schema_presence INTEGER NOT NULL DEFAULT 0,
  content_depth INTEGER NOT NULL DEFAULT 0,
  ai_visibility INTEGER NOT NULL DEFAULT 0,
  -- Overall
  overall_trust_score INTEGER NOT NULL DEFAULT 0,
  trust_tier TEXT NOT NULL DEFAULT 'unrated' CHECK (trust_tier IN ('platinum', 'gold', 'silver', 'bronze', 'unrated')),
  -- Metadata
  signals_breakdown JSONB DEFAULT '{}'::jsonb,
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trust_signal_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trust signal scores"
  ON trust_signal_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
