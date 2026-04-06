-- ============================================================
-- GBP Integration Tables — Run in Supabase SQL Editor
-- ============================================================

-- GBP Profiles
CREATE TABLE IF NOT EXISTS gbp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_account_id TEXT NOT NULL,
  google_location_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  primary_phone TEXT,
  primary_category TEXT,
  additional_categories JSONB DEFAULT '[]',
  website_url TEXT,
  description TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  verification_status TEXT CHECK (verification_status IN ('VERIFIED','UNVERIFIED','PENDING','SUSPENDED')),
  is_open BOOLEAN DEFAULT true,
  regular_hours JSONB,
  special_hours JSONB DEFAULT '[]',
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  photo_count INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '[]',
  service_items JSONB DEFAULT '[]',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_location_id)
);

-- GBP Reviews
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE NOT NULL,
  google_review_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_photo_url TEXT,
  star_rating INTEGER NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  comment TEXT,
  reply_comment TEXT,
  reply_updated_at TIMESTAMPTZ,
  create_time TIMESTAMPTZ NOT NULL,
  update_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gbp_profile_id, google_review_id)
);

-- GBP Posts
CREATE TABLE IF NOT EXISTS gbp_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE NOT NULL,
  google_post_id TEXT NOT NULL,
  topic_type TEXT DEFAULT 'STANDARD',
  summary TEXT,
  media_url TEXT,
  action_type TEXT,
  action_url TEXT,
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,
  create_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gbp_profile_id, google_post_id)
);

-- GBP Q&A
CREATE TABLE IF NOT EXISTS gbp_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE NOT NULL,
  google_question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  author_name TEXT NOT NULL,
  answer_text TEXT,
  answer_author_name TEXT,
  create_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gbp_profile_id, google_question_id)
);

-- GBP Audit Results
CREATE TABLE IF NOT EXISTS gbp_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completeness_score INTEGER DEFAULT 0,
  review_health_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  has_description BOOLEAN DEFAULT false,
  has_phone BOOLEAN DEFAULT false,
  has_website BOOLEAN DEFAULT false,
  has_hours BOOLEAN DEFAULT false,
  has_categories BOOLEAN DEFAULT false,
  has_photos BOOLEAN DEFAULT false,
  has_attributes BOOLEAN DEFAULT false,
  has_services BOOLEAN DEFAULT false,
  total_reviews INTEGER DEFAULT 0,
  average_rating DOUBLE PRECISION DEFAULT 0,
  reviews_last_30_days INTEGER DEFAULT 0,
  review_response_rate DOUBLE PRECISION DEFAULT 0,
  avg_response_time_hours DOUBLE PRECISION,
  negative_review_count INTEGER DEFAULT 0,
  posts_last_30_days INTEGER DEFAULT 0,
  questions_unanswered INTEGER DEFAULT 0,
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GBP Weekly Metrics Snapshots
CREATE TABLE IF NOT EXISTS gbp_weekly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  new_reviews INTEGER DEFAULT 0,
  average_rating DOUBLE PRECISION DEFAULT 0,
  review_response_rate DOUBLE PRECISION DEFAULT 0,
  search_views INTEGER,
  maps_views INTEGER,
  website_clicks INTEGER,
  phone_calls INTEGER,
  direction_requests INTEGER,
  completeness_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gbp_profile_id, week_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gbp_profiles_user_id ON gbp_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_profile_id ON gbp_reviews(gbp_profile_id);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_create_time ON gbp_reviews(create_time DESC);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_profile_id ON gbp_posts(gbp_profile_id);
CREATE INDEX IF NOT EXISTS idx_gbp_audit_user_id ON gbp_audit_results(user_id);
CREATE INDEX IF NOT EXISTS idx_gbp_weekly_profile_id ON gbp_weekly_metrics(gbp_profile_id);

-- RLS
ALTER TABLE gbp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_weekly_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own GBP profile" ON gbp_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reviews" ON gbp_reviews FOR SELECT
  USING (gbp_profile_id IN (SELECT id FROM gbp_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role can write reviews" ON gbp_reviews FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own posts" ON gbp_posts FOR SELECT
  USING (gbp_profile_id IN (SELECT id FROM gbp_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role can write posts" ON gbp_posts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own qa" ON gbp_qa FOR SELECT
  USING (gbp_profile_id IN (SELECT id FROM gbp_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role can write qa" ON gbp_qa FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own audit" ON gbp_audit_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access audit" ON gbp_audit_results FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own weekly metrics" ON gbp_weekly_metrics FOR SELECT
  USING (gbp_profile_id IN (SELECT id FROM gbp_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role can write weekly metrics" ON gbp_weekly_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
