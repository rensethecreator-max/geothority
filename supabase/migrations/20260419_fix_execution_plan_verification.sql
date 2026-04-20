-- Add verification persistence fields to fix execution plans.
-- Run: supabase db push or paste into SQL editor

ALTER TABLE fix_execution_plans
ADD COLUMN IF NOT EXISTS layer_scores_before JSONB,
ADD COLUMN IF NOT EXISTS verification JSONB;

COMMENT ON COLUMN fix_execution_plans.layer_scores_before IS 'Layer score snapshot captured when the execution plan was created.';
COMMENT ON COLUMN fix_execution_plans.verification IS 'Verification workflow state and results for the execution plan.';
