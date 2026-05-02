alter table public.reputation_feedback_items
  add column if not exists assigned_owner_name text,
  add column if not exists follow_up_due_date date,
  add column if not exists resolution_notes text,
  add column if not exists recovery_outcome text,
  add column if not exists resolved_at timestamptz;

create index if not exists reputation_feedback_items_follow_up_due_date_idx
  on public.reputation_feedback_items (user_id, follow_up_due_date);
