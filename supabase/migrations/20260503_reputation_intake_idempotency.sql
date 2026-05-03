-- Prevent duplicate proof/feedback records when the same intake request is retried.

create unique index if not exists reputation_feedback_items_request_id_unique
  on public.reputation_feedback_items (request_id)
  where request_id is not null;

create unique index if not exists reputation_proof_assets_request_id_unique
  on public.reputation_proof_assets (request_id)
  where request_id is not null;
