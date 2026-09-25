-- Fill runtime schema gaps found against the active Geothority Supabase project.

-- Shared cache contents are internal server data and are accessed with service_role.
create table if not exists public.ai_cache (
  key text primary key,
  response text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.ai_cache enable row level security;
revoke all on table public.ai_cache from anon, authenticated, public;
grant all on table public.ai_cache to service_role;

-- The auto-execution route reads these explicit, opt-in settings from user_profiles.
alter table public.user_profiles
  add column if not exists auto_exec_enabled boolean not null default false,
  add column if not exists auto_exec_dry_run boolean not null default true;

-- Provider credentials stay scoped to their owning account.
create table if not exists public.aggregator_user_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('semrush', 'vendasta', 'yext')),
  credentials jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
alter table public.aggregator_user_configs enable row level security;
revoke all on table public.aggregator_user_configs from anon, public;
grant select, insert, update, delete on table public.aggregator_user_configs to authenticated;
drop policy if exists aggregator_user_configs_owner_all on public.aggregator_user_configs;
create policy aggregator_user_configs_owner_all on public.aggregator_user_configs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Public profile reads must still obey the underlying business_profiles policies.
alter view public.public_business_profiles set (security_invoker = true);

-- Citation directory entries are public reference data; keep the catalog read-only.
alter table public.citation_directories enable row level security;
revoke all on table public.citation_directories from anon, authenticated, public;
grant select on table public.citation_directories to anon, authenticated;
drop policy if exists citation_directories_public_read on public.citation_directories;
create policy citation_directories_public_read on public.citation_directories
  for select to anon, authenticated using (true);
