-- Geothority Database Schema
-- Run this in the Supabase SQL Editor

-- User Profiles (extended from Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  city TEXT,
  state TEXT,
  website_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'audit', 'starter', 'pro')),
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
  alerts JSONB DEFAULT '[]',
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

-- Service role bypass for webhooks
CREATE POLICY "Service role full access profiles" ON user_profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access scans" ON scans FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access content" ON generated_content FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access competitors" ON competitors FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
