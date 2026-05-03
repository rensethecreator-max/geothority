-- Immutable reputation event ledger for request state transitions and approval history.

create table if not exists public.reputation_event_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.reputation_requests(id) on delete cascade,
  proof_asset_id uuid references public.reputation_proof_assets(id) on delete set null,
  feedback_item_id uuid references public.reputation_feedback_items(id) on delete set null,
  actor_type text not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  channel text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reputation_event_ledger_user_created_idx
  on public.reputation_event_ledger (user_id, created_at desc);

create index if not exists reputation_event_ledger_request_created_idx
  on public.reputation_event_ledger (request_id, created_at desc)
  where request_id is not null;

create index if not exists reputation_event_ledger_event_type_idx
  on public.reputation_event_ledger (event_type, created_at desc);

create or replace function public.prevent_reputation_event_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'reputation_event_ledger is append-only';
end;
$$;

drop trigger if exists reputation_event_ledger_no_update on public.reputation_event_ledger;
create trigger reputation_event_ledger_no_update
  before update on public.reputation_event_ledger
  for each row
  execute function public.prevent_reputation_event_ledger_mutation();

drop trigger if exists reputation_event_ledger_no_delete on public.reputation_event_ledger;
create trigger reputation_event_ledger_no_delete
  before delete on public.reputation_event_ledger
  for each row
  execute function public.prevent_reputation_event_ledger_mutation();

alter table public.reputation_event_ledger enable row level security;

create policy if not exists "reputation_event_ledger_select_own"
  on public.reputation_event_ledger
  for select using (auth.uid() = user_id);
