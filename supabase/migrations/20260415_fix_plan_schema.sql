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
