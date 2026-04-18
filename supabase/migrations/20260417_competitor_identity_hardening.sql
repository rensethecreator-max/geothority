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
