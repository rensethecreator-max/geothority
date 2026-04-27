-- ============================================================
-- Citation Truth Model + GBP Posts System
-- 1. Canonical business profile (NAP record)
-- 2. Per-directory citation sync state tracking
-- 3. Citation drift monitoring
-- 4. GBP post suggestions + approval queue
-- ============================================================

-- ── 1. Canonical Business Profile ──────────────────────────────
-- Single source of truth for NAP (Name, Address, Phone)
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  categories TEXT[] DEFAULT '{}',
  primary_category TEXT,
  description TEXT,
  logo_url TEXT,
  hours_json JSONB,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  -- Metadata
  nap_hash TEXT,  -- hash of normalized NAP for drift detection
  identity_confidence SMALLINT CHECK (identity_confidence >= 0 AND identity_confidence <= 100),
  last_verified TIMESTAMPTZ,
  verification_source TEXT,  -- 'manual' | 'gbp_sync' | 'scan'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business profile"
  ON business_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user
  ON business_profiles(user_id);

-- ── 2. Citation Directory Registry ─────────────────────────────
-- Tracks each directory and its sync capabilities
CREATE TABLE IF NOT EXISTS citation_directories (
  id TEXT PRIMARY KEY,  -- slug: 'google', 'yelp', 'bing', etc.
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📍',
  website TEXT,
  claim_url TEXT,
  -- Sync mode: what level of automation we support
  sync_mode TEXT NOT NULL DEFAULT 'guided' CHECK (sync_mode IN ('direct', 'distribution', 'guided', 'unknown')),
  -- direct = we have API integration (auto-sync possible)
  -- distribution = we push to a data aggregator that feeds this directory
  -- guided = we provide step-by-step instructions
  -- unknown = we check presence but can't push
  distribution_source TEXT,  -- e.g. 'foursquare' means we push via Foursquare
  check_method TEXT NOT NULL DEFAULT 'scrape' CHECK (check_method IN ('api', 'scrape', 'manual', 'none')),
  priority INTEGER NOT NULL DEFAULT 50,  -- higher = more important
  tier TEXT NOT NULL DEFAULT 'regional' CHECK (tier IN ('major', 'core', 'regional', 'niche')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed major directories with sync modes
INSERT INTO citation_directories (id, name, icon, website, claim_url, sync_mode, check_method, priority, tier) VALUES
  ('google', 'Google Business Profile', '🔍', 'https://business.google.com', 'https://business.google.com/', 'direct', 'api', 100, 'major'),
  ('yelp', 'Yelp', '⭐', 'https://yelp.com', 'https://biz.yelp.com/', 'direct', 'api', 90, 'major'),
  ('bing', 'Bing Places', '🔷', 'https://bingplaces.com', 'https://www.bingplaces.com/', 'guided', 'scrape', 85, 'major'),
  ('apple', 'Apple Maps', '🍎', 'https://mapsconnect.apple.com', 'https://mapsconnect.apple.com/', 'guided', 'scrape', 80, 'major'),
  ('foursquare', 'Foursquare', '🟣', 'https://foursquare.com', 'https://foursquare.com/business/claim', 'direct', 'api', 75, 'core'),
  ('bbb', 'BBB', '🏛️', 'https://bbb.org', 'https://www.bbb.org/get-listed', 'guided', 'scrape', 70, 'core'),
  ('manta', 'Manta', '🟠', 'https://manta.com', 'https://www.manta.com/claim', 'guided', 'scrape', 50, 'regional'),
  ('mapquest', 'MapQuest', '🗺️', 'https://mapquest.com', 'https://www.mapquest.com/my-business', 'distribution', 'scrape', 55, 'core'),
  ('nextdoor', 'Nextdoor', '🏘️', 'https://nextdoor.com', 'https://business.nextdoor.com/', 'guided', 'scrape', 60, 'core'),
  ('hotfrog', 'Hotfrog', '🐸', 'https://hotfrog.com', 'https://www.hotfrog.com/add-your-business', 'guided', 'scrape', 30, 'regional'),
  ('chamber', 'Chamber of Commerce', '🤝', 'https://chamberofcommerce.com', 'https://www.chamberofcommerce.com/add-your-business', 'guided', 'scrape', 45, 'regional'),
  ('superpages', 'Superpages', '📖', 'https://superpages.com', 'https://www.superpages.com/', 'guided', 'scrape', 35, 'regional'),
  ('brownbook', 'Brownbook', '📗', 'https://brownbook.net', 'https://www.brownbook.net/add-your-business/', 'guided', 'scrape', 25, 'regional'),
  ('ezlocal', 'EZLocal', '📍', 'https://ezlocal.com', 'https://www.ezlocal.com/add-business', 'guided', 'scrape', 25, 'regional'),
  ('showmelocal', 'ShowMeLocal', '🔎', 'https://showmelocal.com', 'https://www.showmelocal.com/', 'guided', 'scrape', 20, 'niche'),
  ('uscity', 'US City', '🇺🇸', 'https://uscity.net', 'https://www.uscity.net/', 'guided', 'scrape', 15, 'niche'),
  ('tupalo', 'Tupalo', '📌', 'https://tupalo.co', 'https://www.tupalo.co/', 'guided', 'scrape', 15, 'niche'),
  ('citysearch', 'CitySearch', '🏙️', 'https://citysearch.com', 'https://www.citysearch.com/', 'guided', 'scrape', 20, 'niche')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Citation Sync States (per user per directory) ───────────
CREATE TABLE IF NOT EXISTS citation_sync_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  directory_id TEXT NOT NULL REFERENCES citation_directories(id),
  business_profile_id UUID REFERENCES business_profiles(id),
  -- Current state
  listing_found BOOLEAN,
  name_match BOOLEAN,
  address_match BOOLEAN,
  phone_match BOOLEAN,
  consistency_score SMALLINT CHECK (consistency_score >= 0 AND consistency_score <= 100),
  listing_url TEXT,
  -- Sync tracking
  sync_mode TEXT NOT NULL DEFAULT 'guided',  -- effective mode for this user+directory
  last_checked TIMESTAMPTZ,
  last_synced TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (sync_status IN ('unchecked', 'found', 'mismatch', 'not_found', 'syncing', 'synced', 'failed', 'claim_needed')),
  -- Drift detection
  nap_hash_at_check TEXT,  -- NAP hash at time of check
  drift_detected BOOLEAN DEFAULT FALSE,
  drift_details JSONB DEFAULT '{}'::jsonb,
  -- Fix info
  claim_url TEXT,
  fix_steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE citation_sync_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own citation sync states"
  ON citation_sync_states FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_citation_sync_user_dir
  ON citation_sync_states(user_id, directory_id);
CREATE INDEX IF NOT EXISTS idx_citation_sync_user_status
  ON citation_sync_states(user_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_citation_sync_drift
  ON citation_sync_states(user_id, drift_detected) WHERE drift_detected = TRUE;

-- ── 4. Citation Drift History ──────────────────────────────────
CREATE TABLE IF NOT EXISTS citation_drift_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  citation_sync_state_id UUID NOT NULL REFERENCES citation_sync_states(id) ON DELETE CASCADE,
  directory_id TEXT NOT NULL REFERENCES citation_directories(id),
  -- What changed
  drift_type TEXT NOT NULL,  -- 'name_mismatch' | 'address_mismatch' | 'phone_mismatch' | 'listing_lost' | 'listing_found' | 'score_drop'
  before_value TEXT,
  after_value TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  notification_sent BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE citation_drift_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own citation drift log"
  ON citation_drift_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_citation_drift_user_detected
  ON citation_drift_log(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_citation_drift_directory
  ON citation_drift_log(directory_id, detected_at DESC);

-- ── 5. GBP Posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gbp_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Post content
  title TEXT,
  body TEXT NOT NULL,
  cta_type TEXT,  -- 'BOOK' | 'ORDER' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL'
  cta_url TEXT,
  image_url TEXT,
  post_type TEXT NOT NULL DEFAULT 'standard' CHECK (post_type IN ('standard', 'event', 'offer')),
  -- Suggestion context
  suggestion_reason TEXT,  -- why this was suggested
  business_context JSONB DEFAULT '{}'::jsonb,  -- context used to generate
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'published', 'failed', 'expired')),
  auto_generated BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  gbp_post_id TEXT,  -- Google's post ID after publishing
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Performance (post-publish)
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fresh projects can hit this migration after an older gbp_posts definition already exists
-- from migration.sql/GBP bootstrap. Normalize the table shape so later policies/indexes work.
ALTER TABLE gbp_posts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS cta_type TEXT,
  ADD COLUMN IF NOT EXISTS cta_url TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS suggestion_reason TEXT,
  ADD COLUMN IF NOT EXISTS business_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE gbp_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own GBP posts"
  ON gbp_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gbp_posts_user_status
  ON gbp_posts(user_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_user_created
  ON gbp_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_pending
  ON gbp_posts(user_id, status) WHERE status IN ('draft', 'pending_approval');

-- ── 6. GBP Post Templates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS gbp_post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body_template TEXT NOT NULL,
  cta_type TEXT,
  cta_url TEXT,
  category TEXT,  -- e.g. 'seasonal', 'promotional', 'educational', 'community'
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gbp_post_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own GBP post templates"
  ON gbp_post_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
