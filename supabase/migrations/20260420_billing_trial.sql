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
