-- Tenant isolation for customer contact data, review workflows and stored proof.
-- Server-side service_role operations continue to bypass RLS; authenticated
-- Data API access is limited to rows belonging to auth.uid().

alter table public.reputation_settings enable row level security;
alter table public.reputation_templates enable row level security;
alter table public.reputation_contacts enable row level security;
alter table public.reputation_requests enable row level security;
alter table public.reputation_message_log enable row level security;
alter table public.reputation_feedback_items enable row level security;
alter table public.reputation_proof_assets enable row level security;
alter table public.reputation_event_ledger enable row level security;
alter table public.business_brand_profiles enable row level security;
alter function public.prevent_reputation_event_ledger_mutation() set search_path = pg_catalog;

alter table public.reputation_proof_assets
  add column if not exists customer_permission_at timestamptz;

-- Legacy review replies were collected as private feedback, without a separate
-- customer opt-in to quote them. Keep the text for the account owner, but
-- remove approval and publication until explicit permission is captured.
update public.reputation_proof_assets
set approved = false, published_to = '{}'
where request_id is not null and customer_permission_at is null;

revoke all on table
  public.reputation_settings,
  public.reputation_templates,
  public.reputation_contacts,
  public.reputation_requests,
  public.reputation_message_log,
  public.reputation_feedback_items,
  public.reputation_proof_assets,
  public.reputation_event_ledger,
  public.business_brand_profiles
from anon, public;

grant select, insert, update, delete on table
  public.reputation_settings,
  public.reputation_templates,
  public.reputation_contacts,
  public.reputation_requests,
  public.reputation_feedback_items,
  public.reputation_proof_assets,
  public.business_brand_profiles
to authenticated;
grant select, insert on table public.reputation_message_log to authenticated;
grant select on table public.reputation_event_ledger to authenticated;

-- Clear any legacy or manually-added policies first. PostgreSQL combines
-- permissive policies with OR, so a stale broad policy would otherwise defeat
-- the owner-scoped policy added below.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'reputation_settings', 'reputation_templates', 'reputation_contacts',
        'reputation_requests', 'reputation_message_log', 'reputation_feedback_items',
        'reputation_proof_assets', 'reputation_event_ledger', 'business_brand_profiles'
      ])
  loop
    execute format('drop policy %I on %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  end loop;
end;
$$;

create policy reputation_settings_owner_all on public.reputation_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reputation_templates_owner_all on public.reputation_templates
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reputation_contacts_owner_all on public.reputation_contacts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reputation_requests_owner_all on public.reputation_requests
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reputation_message_log_owner_read on public.reputation_message_log
  for select to authenticated
  using (exists (
    select 1 from public.reputation_requests r
    where r.id = request_id and r.user_id = (select auth.uid())
  ));
create policy reputation_message_log_owner_insert on public.reputation_message_log
  for insert to authenticated
  with check (exists (
    select 1 from public.reputation_requests r
    where r.id = request_id and r.user_id = (select auth.uid())
  ));

create policy reputation_feedback_items_owner_all on public.reputation_feedback_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reputation_proof_assets_owner_all on public.reputation_proof_assets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reputation_event_ledger_select_own on public.reputation_event_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy business_brand_profiles_owner_all on public.business_brand_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
