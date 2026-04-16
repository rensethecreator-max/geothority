CREATE TABLE IF NOT EXISTS fix_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scan_id UUID NOT NULL,
  fixes JSONB NOT NULL DEFAULT '[]',
  total_fixes INTEGER DEFAULT 0,
  auto_applied_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON fix_packages(user_id);
CREATE INDEX ON fix_packages(scan_id);
ALTER TABLE fix_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own fix packages" ON fix_packages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create fix packages" ON fix_packages FOR INSERT WITH CHECK (auth.uid() = user_id);
