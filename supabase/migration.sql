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
