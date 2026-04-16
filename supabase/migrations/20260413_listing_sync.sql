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
