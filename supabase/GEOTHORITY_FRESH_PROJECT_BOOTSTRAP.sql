-- Geothority fresh-project bootstrap for a dedicated Supabase project
-- Generated on 2026-05-03 to migrate only Geothority schema
-- Ordered to satisfy table dependencies for a clean project bootstrap
create extension if not exists pgcrypto;


-- ==================================================================
-- BEGIN migration.sql
-- ==================================================================
-- Geothority Database Schema
-- Run this in the Supabase SQL Editor

-- User Profiles (extended from Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  city TEXT,
  state TEXT,
  website_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'audit', 'starter', 'growth', 'authority', 'agency', 'pro')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  cms_type TEXT CHECK (cms_type IN ('wordpress', 'wix', 'squarespace', NULL)),
  cms_credentials JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scans
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  business_name TEXT,
  city TEXT,
  state TEXT,
  geothority_score INTEGER,
  geo_readiness_score INTEGER,
  layer_scores JSONB,
  quick_wins JSONB,
  competitor_gaps JSONB,
  raw_scan_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Content
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('landing_page', 'trust_page', 'faq', 'about')),
  city TEXT,
  service TEXT,
  title TEXT,
  meta_description TEXT,
  content_html TEXT,
  content_markdown TEXT,
  schema_json JSONB,
  quality_score INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  cms_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  business_name TEXT,
  city TEXT,
  rank_position INTEGER,
  last_checked TIMESTAMPTZ,
  alerts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Business Profile — Main Table
CREATE TABLE IF NOT EXISTS gbp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  google_account_id TEXT NOT NULL,
  google_location_id TEXT NOT NULL,
  business_name TEXT,
  primary_phone TEXT,
  primary_category TEXT,
  additional_categories TEXT[],
  website_url TEXT,
  description TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  verification_status TEXT,
  is_open BOOLEAN,
  regular_hours JSONB,
  special_hours JSONB,
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  photo_count INTEGER,
  attributes JSONB,
  service_items JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Business Profile — Reviews
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  google_review_id TEXT NOT NULL,
  reviewer_name TEXT,
  reviewer_photo_url TEXT,
  star_rating INTEGER,
  comment TEXT,
  reply_comment TEXT,
  reply_updated_at TIMESTAMPTZ,
  create_time TEXT,
  update_time TEXT,
  synced_at TIMESTAMPTZ
);

-- Google Business Profile — Posts
CREATE TABLE IF NOT EXISTS gbp_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  google_post_id TEXT NOT NULL,
  topic_type TEXT,
  summary TEXT,
  media_url TEXT,
  action_type TEXT,
  action_url TEXT,
  event_start TEXT,
  event_end TEXT,
  create_time TEXT,
  synced_at TIMESTAMPTZ
);

-- Google Business Profile — Questions and Answers
CREATE TABLE IF NOT EXISTS gbp_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  google_question_id TEXT NOT NULL,
  question_text TEXT,
  author_name TEXT,
  answer_text TEXT,
  answer_author_name TEXT,
  create_time TEXT,
  synced_at TIMESTAMPTZ
);

-- Google Business Profile — Audit Results
CREATE TABLE IF NOT EXISTS gbp_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completeness_score INTEGER,
  review_health_score INTEGER,
  engagement_score INTEGER,
  overall_score INTEGER,
  has_description BOOLEAN,
  has_phone BOOLEAN,
  has_website BOOLEAN,
  has_hours BOOLEAN,
  has_categories BOOLEAN,
  has_photos BOOLEAN,
  has_attributes BOOLEAN,
  has_services BOOLEAN,
  total_reviews INTEGER,
  average_rating NUMERIC,
  reviews_last_30_days INTEGER,
  review_response_rate NUMERIC,
  avg_response_time_hours NUMERIC,
  negative_review_count INTEGER,
  posts_last_30_days INTEGER,
  questions_unanswered INTEGER,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Business Profile — Weekly Metrics
CREATE TABLE IF NOT EXISTS gbp_weekly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  week_start TIMESTAMPTZ,
  week_end TIMESTAMPTZ,
  total_reviews INTEGER,
  new_reviews INTEGER,
  average_rating NUMERIC,
  review_response_rate NUMERIC,
  search_views INTEGER,
  maps_views INTEGER,
  website_clicks INTEGER,
  phone_calls INTEGER,
  direction_requests INTEGER,
  completeness_score INTEGER,
  overall_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_weekly_metrics ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own scans" ON scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own content" ON generated_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content" ON generated_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content" ON generated_content FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own competitors" ON competitors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own competitors" ON competitors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own competitors" ON competitors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own competitors" ON competitors FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own GBP profiles" ON gbp_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own GBP profiles" ON gbp_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own GBP profiles" ON gbp_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own GBP reviews" ON gbp_reviews FOR SELECT USING (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_reviews.gbp_profile_id));
CREATE POLICY "Users can insert own GBP reviews" ON gbp_reviews FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_reviews.gbp_profile_id));

CREATE POLICY "Users can view own GBP posts" ON gbp_posts FOR SELECT USING (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_posts.gbp_profile_id));
CREATE POLICY "Users can insert own GBP posts" ON gbp_posts FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_posts.gbp_profile_id));

CREATE POLICY "Users can view own GBP questions" ON gbp_questions FOR SELECT USING (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_questions.gbp_profile_id));
CREATE POLICY "Users can insert own GBP questions" ON gbp_questions FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_questions.gbp_profile_id));

CREATE POLICY "Users can view own GBP audits" ON gbp_audits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own GBP audits" ON gbp_audits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own GBP audits" ON gbp_audits FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own GBP weekly metrics" ON gbp_weekly_metrics FOR SELECT USING (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_weekly_metrics.gbp_profile_id));
CREATE POLICY "Users can insert own GBP weekly metrics" ON gbp_weekly_metrics FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM gbp_profiles WHERE id = gbp_weekly_metrics.gbp_profile_id));

-- Service role bypass for webhooks
CREATE POLICY "Service role full access profiles" ON user_profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access scans" ON scans FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access content" ON generated_content FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access competitors" ON competitors FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access GBP profiles" ON gbp_profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access GBP reviews" ON gbp_reviews FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access GBP posts" ON gbp_posts FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access GBP questions" ON gbp_questions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access GBP audits" ON gbp_audits FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access GBP weekly metrics" ON gbp_weekly_metrics FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grants: authenticated users still need base table privileges in addition to RLS policies
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ==================================================================
-- END migration.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260406_gbp_tables.sql
-- ==================================================================
-- ============================================================
-- Google Business Profile tables for Geothority
-- Run this migration against your Supabase project
-- ============================================================

-- GBP Profiles (one per user per location)
CREATE TABLE IF NOT EXISTS gbp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_account_id TEXT NOT NULL,
  google_location_id TEXT NOT NULL,
  business_name TEXT NOT NULL,

  -- Primary info
  primary_phone TEXT,
  primary_category TEXT,
  additional_categories JSONB DEFAULT '[]'::jsonb,
  website_url TEXT,
  description TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Status
  verification_status TEXT CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'PENDING', 'SUSPENDED')),
  is_open BOOLEAN DEFAULT true,

  -- Hours (stored as JSON)
  regular_hours JSONB,
  special_hours JSONB,

  -- Media
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  photo_count INTEGER DEFAULT 0,

  -- Attributes / services (stored as JSON arrays)
  attributes JSONB DEFAULT '[]'::jsonb,
  service_items JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique per user + location
  UNIQUE(user_id, google_location_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_gbp_profiles_user_id ON gbp_profiles(user_id);

-- GBP Reviews
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID NOT NULL REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  google_review_id TEXT NOT NULL UNIQUE,
  reviewer_name TEXT NOT NULL,
  reviewer_photo_url TEXT,
  star_rating SMALLINT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  comment TEXT,
  reply_comment TEXT,
  reply_updated_at TIMESTAMPTZ,
  create_time TIMESTAMPTZ NOT NULL,
  update_time TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbp_reviews_profile ON gbp_reviews(gbp_profile_id);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_create_time ON gbp_reviews(create_time DESC);

-- GBP Posts
CREATE TABLE IF NOT EXISTS gbp_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID NOT NULL REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  google_post_id TEXT NOT NULL UNIQUE,
  topic_type TEXT DEFAULT 'STANDARD',
  summary TEXT,
  media_url TEXT,
  action_type TEXT,
  action_url TEXT,
  event_start TEXT,
  event_end TEXT,
  create_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbp_posts_profile ON gbp_posts(gbp_profile_id);

-- GBP Questions & Answers
CREATE TABLE IF NOT EXISTS gbp_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID NOT NULL REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  google_question_id TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  author_name TEXT NOT NULL,
  answer_text TEXT,
  answer_author_name TEXT,
  create_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbp_questions_profile ON gbp_questions(gbp_profile_id);

-- GBP Audit Results
CREATE TABLE IF NOT EXISTS gbp_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID NOT NULL REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scores
  completeness_score INTEGER DEFAULT 0,
  review_health_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,

  -- Completeness breakdown
  has_description BOOLEAN DEFAULT false,
  has_phone BOOLEAN DEFAULT false,
  has_website BOOLEAN DEFAULT false,
  has_hours BOOLEAN DEFAULT false,
  has_categories BOOLEAN DEFAULT false,
  has_photos BOOLEAN DEFAULT false,
  has_attributes BOOLEAN DEFAULT false,
  has_services BOOLEAN DEFAULT false,

  -- Review breakdown
  total_reviews INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  reviews_last_30_days INTEGER DEFAULT 0,
  review_response_rate NUMERIC(3,2) DEFAULT 0,
  avg_response_time_hours NUMERIC,
  negative_review_count INTEGER DEFAULT 0,

  -- Engagement
  posts_last_30_days INTEGER DEFAULT 0,
  questions_unanswered INTEGER DEFAULT 0,

  -- Recommendations (JSON array)
  recommendations JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- One audit per profile (latest wins)
  UNIQUE(gbp_profile_id)
);

-- GBP Weekly Metrics
CREATE TABLE IF NOT EXISTS gbp_weekly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID NOT NULL REFERENCES gbp_profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  new_reviews INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  review_response_rate NUMERIC(3,2) DEFAULT 0,
  search_views INTEGER,
  maps_views INTEGER,
  website_clicks INTEGER,
  phone_calls INTEGER,
  direction_requests INTEGER,
  completeness_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(gbp_profile_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_gbp_weekly_profile ON gbp_weekly_metrics(gbp_profile_id);

-- Enable RLS on all tables
ALTER TABLE gbp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_weekly_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see/modify their own data

-- gbp_profiles
CREATE POLICY "Users can view own profiles" ON gbp_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profiles" ON gbp_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profiles" ON gbp_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profiles" ON gbp_profiles FOR DELETE USING (auth.uid() = user_id);

-- gbp_reviews (via profile ownership)
CREATE POLICY "Users can view own reviews" ON gbp_reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_reviews.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can insert own reviews" ON gbp_reviews FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_reviews.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can update own reviews" ON gbp_reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_reviews.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));

-- gbp_posts
CREATE POLICY "Users can view own posts" ON gbp_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_posts.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can insert own posts" ON gbp_posts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_posts.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can update own posts" ON gbp_posts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_posts.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));

-- gbp_questions
CREATE POLICY "Users can view own questions" ON gbp_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_questions.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can insert own questions" ON gbp_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_questions.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can update own questions" ON gbp_questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_questions.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));

-- gbp_audits
CREATE POLICY "Users can view own audits" ON gbp_audits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audits" ON gbp_audits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audits" ON gbp_audits FOR UPDATE USING (auth.uid() = user_id);

-- gbp_weekly_metrics
CREATE POLICY "Users can view own metrics" ON gbp_weekly_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_weekly_metrics.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can insert own metrics" ON gbp_weekly_metrics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_weekly_metrics.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));
CREATE POLICY "Users can update own metrics" ON gbp_weekly_metrics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM gbp_profiles WHERE gbp_profiles.id = gbp_weekly_metrics.gbp_profile_id AND gbp_profiles.user_id = auth.uid()));

-- ==================================================================
-- END 20260406_gbp_tables.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260412_gbp_monitor_score_history.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260412_gbp_monitor_score_history.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260412_saas_package.sql
-- ==================================================================
-- ============================================================
-- Standard SaaS Package Migration for Geothority
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Support ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Diagnostics ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS diagnostic_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected',
  description TEXT,
  auto_repair_attempted BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS repair_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES diagnostic_issues(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ── Analytics ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  metadata JSONB,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email Journey ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_journey_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id TEXT NOT NULL,
  delay_days INTEGER,
  trigger_event TEXT,
  type TEXT NOT NULL DEFAULT 'delay',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_email_journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id TEXT NOT NULL,
  current_step_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_journey_progress_user_id ON user_email_journey_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_email_journey_progress_status ON user_email_journey_progress(status);
CREATE INDEX IF NOT EXISTS idx_email_journey_progress_next_send ON user_email_journey_progress(next_send_at);

-- ── Push Notifications ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_push_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  category_product_updates BOOLEAN DEFAULT TRUE,
  category_journey BOOLEAN DEFAULT TRUE,
  category_alerts BOOLEAN DEFAULT TRUE,
  category_digest BOOLEAN DEFAULT TRUE,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  max_per_day INTEGER DEFAULT 5,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id TEXT NOT NULL,
  current_step_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_journey_progress_status ON push_journey_progress(status);
CREATE INDEX IF NOT EXISTS idx_push_journey_progress_next_send ON push_journey_progress(next_send_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_journey_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_journey_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_journey_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_actions ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for API routes using service key)
CREATE POLICY "Service role full access" ON support_conversations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON support_messages FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON analytics_events FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON daily_metrics FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON email_journey_steps FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON user_email_journey_progress FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON push_subscriptions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON push_notification_log FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON user_push_preferences FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON push_journey_progress FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON diagnostic_issues FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON repair_actions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User can access their own data
CREATE POLICY "Users own support conversations" ON support_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users own push subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own push preferences" ON user_push_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own email journey progress" ON user_email_journey_progress FOR SELECT USING (auth.uid() = user_id);

-- ==================================================================
-- END 20260412_saas_package.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260413_listing_sync.sql
-- ==================================================================
-- Listing Sync table: tracks Foursquare network syncs per user
CREATE TABLE IF NOT EXISTS listing_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  fsq_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  directories_reached INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listing_syncs_user_id_idx ON listing_syncs(user_id);
CREATE INDEX IF NOT EXISTS listing_syncs_synced_at_idx ON listing_syncs(synced_at);

ALTER TABLE listing_syncs ENABLE ROW LEVEL SECURITY;

-- Users can only see and create their own sync records
CREATE POLICY "Users see own syncs"
  ON listing_syncs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create syncs"
  ON listing_syncs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==================================================================
-- END 20260413_listing_sync.sql
-- ==================================================================


-- ==================================================================
-- BEGIN fix_packages.sql
-- ==================================================================
CREATE TABLE IF NOT EXISTS fix_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scan_id UUID NOT NULL,
  fixes JSONB NOT NULL DEFAULT '[]',
  total_fixes INTEGER DEFAULT 0,
  auto_applied_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fix_packages_user_id ON fix_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_fix_packages_scan_id ON fix_packages(scan_id);
ALTER TABLE fix_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own fix packages" ON fix_packages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create fix packages" ON fix_packages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==================================================================
-- END fix_packages.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260415_fix_plan_schema.sql
-- ==================================================================
-- ============================================================
-- Fix 1: Plan schema mismatch & add onboarding_completed
-- The old CHECK constraint only allowed ('free','audit','starter','pro')
-- but Stripe plans are: starter, growth, authority, agency
-- Writing growth/authority/agency from webhook silently violated the constraint.
-- ============================================================

-- Drop old constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;

-- Add corrected constraint with all real Stripe plan keys
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_plan_check
  CHECK (plan IN ('free', 'audit', 'starter', 'growth', 'authority', 'agency', 'pro'));

-- Add onboarding_completed flag for server-side onboarding persistence
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Index for onboarding redirect check in middleware
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding
  ON user_profiles(id) WHERE onboarding_completed = FALSE;

-- ==================================================================
-- END 20260415_fix_plan_schema.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260417_competitor_identity_hardening.sql
-- ==================================================================
-- ============================================================
-- Competitor Identity Hardening
-- Preserve stable competitor rows across refreshes so snapshots keep history
-- ============================================================

ALTER TABLE competitors
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_competitors_user_place_id
  ON competitors(user_id, place_id)
  WHERE place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competitors_user_active_rank
  ON competitors(user_id, active, rank_position);

-- ==================================================================
-- END 20260417_competitor_identity_hardening.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260417_competitor_snapshots.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260417_competitor_snapshots.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260417_competitor_profile_attributes.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260417_competitor_profile_attributes.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260417_scheduled_tasks.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260417_scheduled_tasks.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260418_keyword_research.sql
-- ==================================================================
-- Keyword Research Jobs table
-- Stores results from the Automated Local Keyword Research & Content Gap Analysis module

CREATE TABLE IF NOT EXISTS keyword_research_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id TEXT,
  business_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'insurance_agency',
  services JSONB NOT NULL DEFAULT '[]',
  competitors JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  keywords JSONB NOT NULL DEFAULT '[]',
  content_gaps JSONB NOT NULL DEFAULT '[]',
  topic_clusters JSONB NOT NULL DEFAULT '[]',
  content_briefs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE keyword_research_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own keyword research jobs"
  ON keyword_research_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keyword research jobs"
  ON keyword_research_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyword research jobs"
  ON keyword_research_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keyword research jobs"
  ON keyword_research_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_keyword_research_user_id ON keyword_research_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_research_scan_id ON keyword_research_jobs(scan_id);

-- ==================================================================
-- END 20260418_keyword_research.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260419_automation_policies.sql
-- ==================================================================
-- Automation policies: per-action policy stored on user_profiles
-- Run: supabase db push or paste into SQL editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS automation_policies JSONB DEFAULT '{
  "publish_to_cms": "approval_required",
  "generate_content": "auto_apply",
  "listing_sync": "auto_apply",
  "gbp_actions": "approval_required"
}';

COMMENT ON COLUMN user_profiles.automation_policies IS 'Per-action automation policy: auto_apply | approval_required | manual_only';

-- ==================================================================
-- END 20260419_automation_policies.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260419_fix_execution_plans.sql
-- ==================================================================
-- Persist Geothority fix engine execution plans so AUTO / ASSISTED / GUIDED
-- workflows survive process restarts and can be resumed safely.

CREATE TABLE IF NOT EXISTS fix_execution_plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('AUTO', 'ASSISTED', 'GUIDED')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  needs_input INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('planning', 'executing', 'paused', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fix_execution_plans_user_created
  ON fix_execution_plans(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fix_execution_plans_scan
  ON fix_execution_plans(scan_id);

ALTER TABLE fix_execution_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own fix execution plans"
  ON fix_execution_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own fix execution plans"
  ON fix_execution_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own fix execution plans"
  ON fix_execution_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==================================================================
-- END 20260419_fix_execution_plans.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260419_fix_execution_plan_verification.sql
-- ==================================================================
-- Add verification persistence fields to fix execution plans.
-- Run: supabase db push or paste into SQL editor

ALTER TABLE fix_execution_plans
ADD COLUMN IF NOT EXISTS layer_scores_before JSONB,
ADD COLUMN IF NOT EXISTS verification JSONB;

COMMENT ON COLUMN fix_execution_plans.layer_scores_before IS 'Layer score snapshot captured when the execution plan was created.';
COMMENT ON COLUMN fix_execution_plans.verification IS 'Verification workflow state and results for the execution plan.';

-- ==================================================================
-- END 20260419_fix_execution_plan_verification.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260419_smart_expansion.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260419_smart_expansion.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260420_billing_trial.sql
-- ==================================================================
-- Migration: Billing improvements — trial tracking, billing cycle, subscription status
-- Date: 2026-04-20

-- Add billing cycle column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual'));

-- Add subscription status column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'canceled', 'past_due', 'unpaid'));

-- Add trial end date column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Add AI visibility scorecards table if not exists (for the AI visibility change alert cron)
CREATE TABLE IF NOT EXISTS ai_visibility_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_set_id uuid,
  overall_score integer NOT NULL DEFAULT 0,
  previous_overall_score integer,
  score_delta integer,
  engine_scores jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, query_set_id)
);

-- Enable RLS
ALTER TABLE ai_visibility_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scorecards" ON ai_visibility_scorecards
  FOR SELECT USING (auth.uid() = user_id);

-- ==================================================================
-- END 20260420_billing_trial.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260420_citation_truth_gbp_posts.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260420_citation_truth_gbp_posts.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260420_gbp_auth_ai_visibility.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260420_gbp_auth_ai_visibility.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260420_phases_5_through_8.sql
-- ==================================================================
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

-- ==================================================================
-- END 20260420_phases_5_through_8.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260501_reputation_engine.sql
-- ==================================================================
-- Reputation Engine foundational schema for Geothority

create table if not exists public.reputation_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  google_review_link text,
  sms_delay_minutes integer not null default 60,
  positive_threshold integer not null default 4,
  sms_template text not null default 'Hi {customer_name}! Thanks for choosing {business_name}. How was your experience? Reply 1-5 and we''ll take it from there. (Reply STOP to opt out)',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reputation_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null,
  phone text not null,
  name text,
  email text,
  opt_out boolean not null default false,
  source text default 'manual',
  created_at timestamptz not null default now()
);

create unique index if not exists reputation_contacts_business_phone_idx
  on public.reputation_contacts (business_id, phone);

create table if not exists public.reputation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null,
  contact_id uuid not null references public.reputation_contacts(id) on delete cascade,
  trigger_source text not null default 'manual',
  external_event_id text,
  status text not null default 'pending',
  delivery_state text not null default 'pending',
  send_attempt_count integer not null default 0,
  last_send_attempt_at timestamptz,
  last_send_error text,
  next_retry_at timestamptz,
  dead_lettered_at timestamptz,
  score integer,
  feedback_text text,
  review_token text unique,
  google_link_sent boolean not null default false,
  template_used text,
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reputation_requests_contact_created_idx
  on public.reputation_requests (contact_id, created_at desc);

create index if not exists reputation_requests_delivery_state_idx
  on public.reputation_requests (user_id, delivery_state, created_at desc);

create index if not exists reputation_requests_next_retry_idx
  on public.reputation_requests (delivery_state, next_retry_at)
  where next_retry_at is not null;

create table if not exists public.reputation_message_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.reputation_requests(id) on delete cascade,
  direction text not null,
  body text not null,
  provider_sid text,
  attempt_number integer not null default 1,
  delivery_state text not null default 'sent',
  error_detail text,
  simulated boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists reputation_message_log_request_attempt_idx
  on public.reputation_message_log (request_id, attempt_number desc, created_at desc);

create table if not exists public.reputation_templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  category_label text not null,
  icon text not null default '⭐',
  template_text text not null,
  is_default boolean not null default false,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reputation_templates_user_idx
  on public.reputation_templates (user_id, created_at asc);

create table if not exists public.reputation_feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  request_id uuid references public.reputation_requests(id) on delete set null,
  business_id text not null,
  severity text default 'medium',
  topic text,
  feedback_text text not null,
  follow_up_status text not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_proof_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  business_id text not null,
  request_id uuid references public.reputation_requests(id) on delete set null,
  snippet text not null,
  topic text,
  sentiment text default 'positive',
  approved boolean not null default false,
  published_to text[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.reputation_settings enable row level security;
alter table public.reputation_templates enable row level security;

create policy if not exists "reputation_settings_select_own"
  on public.reputation_settings
  for select using (auth.uid() = user_id);

create policy if not exists "reputation_settings_upsert_own"
  on public.reputation_settings
  for insert with check (auth.uid() = user_id);

create policy if not exists "reputation_settings_update_own"
  on public.reputation_settings
  for update using (auth.uid() = user_id);

create policy if not exists "reputation_templates_select_own"
  on public.reputation_templates
  for select using (auth.uid() = user_id);

create policy if not exists "reputation_templates_insert_own"
  on public.reputation_templates
  for insert with check (auth.uid() = user_id);

create policy if not exists "reputation_templates_update_own"
  on public.reputation_templates
  for update using (auth.uid() = user_id);

create policy if not exists "reputation_templates_delete_own"
  on public.reputation_templates
  for delete using (auth.uid() = user_id);

-- ==================================================================
-- END 20260501_reputation_engine.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260502_feedback_recovery.sql
-- ==================================================================
alter table public.reputation_feedback_items
  add column if not exists assigned_owner_name text,
  add column if not exists follow_up_due_date date,
  add column if not exists resolution_notes text,
  add column if not exists recovery_outcome text,
  add column if not exists resolved_at timestamptz;

create index if not exists reputation_feedback_items_follow_up_due_date_idx
  on public.reputation_feedback_items (user_id, follow_up_due_date);

-- ==================================================================
-- END 20260502_feedback_recovery.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260502_reputation_event_idempotency.sql
-- ==================================================================
-- Ensure external event ingests are idempotent per user.
create unique index if not exists reputation_requests_user_external_event_idx
  on public.reputation_requests (user_id, external_event_id)
  where external_event_id is not null;

-- ==================================================================
-- END 20260502_reputation_event_idempotency.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260503_reputation_contacts_multitenant_uniqueness.sql
-- ==================================================================
-- Fix reputation contact uniqueness to scope by user and normalized phone.

update public.reputation_contacts
set phone = regexp_replace(phone, '[^0-9+]', '', 'g')
where phone ~ '[^0-9+]';

with ranked as (
  select ctid,
         row_number() over (
           partition by user_id, business_id, phone
           order by created_at asc, id asc
         ) as rn
  from public.reputation_contacts
)
delete from public.reputation_contacts
where ctid in (
  select ctid
  from ranked
  where rn > 1
);

drop index if exists public.reputation_contacts_business_phone_idx;

create unique index if not exists reputation_contacts_user_business_phone_idx
  on public.reputation_contacts (user_id, business_id, phone);

-- ==================================================================
-- END 20260503_reputation_contacts_multitenant_uniqueness.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260503_reputation_intake_idempotency.sql
-- ==================================================================
-- Prevent duplicate proof/feedback records when the same intake request is retried.

create unique index if not exists reputation_feedback_items_request_id_unique
  on public.reputation_feedback_items (request_id)
  where request_id is not null;

create unique index if not exists reputation_proof_assets_request_id_unique
  on public.reputation_proof_assets (request_id)
  where request_id is not null;

-- ==================================================================
-- END 20260503_reputation_intake_idempotency.sql
-- ==================================================================


-- ==================================================================
-- BEGIN 20260503_reputation_event_ledger.sql
-- ==================================================================
-- Immutable reputation event ledger for request state transitions and approval history.

create table if not exists public.reputation_event_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.reputation_requests(id) on delete cascade,
  proof_asset_id uuid references public.reputation_proof_assets(id) on delete set null,
  feedback_item_id uuid references public.reputation_feedback_items(id) on delete set null,
  actor_type text not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  channel text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reputation_event_ledger_user_created_idx
  on public.reputation_event_ledger (user_id, created_at desc);

create index if not exists reputation_event_ledger_request_created_idx
  on public.reputation_event_ledger (request_id, created_at desc)
  where request_id is not null;

create index if not exists reputation_event_ledger_event_type_idx
  on public.reputation_event_ledger (event_type, created_at desc);

create or replace function public.prevent_reputation_event_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'reputation_event_ledger is append-only';
end;
$$;

drop trigger if exists reputation_event_ledger_no_update on public.reputation_event_ledger;
create trigger reputation_event_ledger_no_update
  before update on public.reputation_event_ledger
  for each row
  execute function public.prevent_reputation_event_ledger_mutation();

drop trigger if exists reputation_event_ledger_no_delete on public.reputation_event_ledger;
create trigger reputation_event_ledger_no_delete
  before delete on public.reputation_event_ledger
  for each row
  execute function public.prevent_reputation_event_ledger_mutation();

alter table public.reputation_event_ledger enable row level security;

create policy if not exists "reputation_event_ledger_select_own"
  on public.reputation_event_ledger
  for select using (auth.uid() = user_id);

-- ==================================================================
-- END 20260503_reputation_event_ledger.sql
-- ==================================================================
