-- Normalize generated_content for expansion/content flows.
-- Base schema only allowed a narrow legacy type set, while the app now creates
-- service/city expansion drafts and stores operational metadata alongside them.

ALTER TABLE generated_content
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'generated_content_type_check'
      AND conrelid = 'generated_content'::regclass
  ) THEN
    ALTER TABLE generated_content DROP CONSTRAINT generated_content_type_check;
  END IF;
END $$;

ALTER TABLE generated_content
  ADD CONSTRAINT generated_content_type_check
  CHECK (
    type IN (
      'landing_page',
      'blog_post',
      'service_page',
      'city_page',
      'localized_faq',
      'trust_page',
      'about'
    )
  );

CREATE INDEX IF NOT EXISTS idx_generated_content_type_status
  ON generated_content(user_id, type, status, created_at DESC);
