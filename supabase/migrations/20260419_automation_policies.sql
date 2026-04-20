-- Automation policies: per-action policy stored on user_profiles
-- Run: supabase db push or paste into SQL editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS automation_policies JSONB DEFAULT '{
  "publish_to_cms": "approval_required",
  "generate_content": "auto_apply",
  "listing_sync": "auto_apply",
  "gbp_actions": "approval_required"
}';

COMMENT ON COLUMN user_profiles.automation_policies IS 'Per-action automation policy: auto_apply | approval_required | manual_only';
