-- Ensure external event ingests are idempotent per user.
create unique index if not exists reputation_requests_user_external_event_idx
  on public.reputation_requests (user_id, external_event_id)
  where external_event_id is not null;
