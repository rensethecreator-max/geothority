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
