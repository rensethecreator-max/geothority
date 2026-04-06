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
