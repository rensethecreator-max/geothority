-- Reputation send runtime hardening: execution state, retry visibility, and dead-letter metadata

alter table if exists public.reputation_requests
  add column if not exists delivery_state text not null default 'pending',
  add column if not exists send_attempt_count integer not null default 0,
  add column if not exists last_send_attempt_at timestamptz,
  add column if not exists last_send_error text,
  add column if not exists next_retry_at timestamptz,
  add column if not exists dead_lettered_at timestamptz;

create index if not exists reputation_requests_delivery_state_idx
  on public.reputation_requests (user_id, delivery_state, created_at desc);

create index if not exists reputation_requests_next_retry_idx
  on public.reputation_requests (delivery_state, next_retry_at)
  where next_retry_at is not null;

alter table if exists public.reputation_message_log
  add column if not exists attempt_number integer not null default 1,
  add column if not exists delivery_state text not null default 'sent',
  add column if not exists error_detail text,
  add column if not exists simulated boolean not null default true;

create index if not exists reputation_message_log_request_attempt_idx
  on public.reputation_message_log (request_id, attempt_number desc, created_at desc);
