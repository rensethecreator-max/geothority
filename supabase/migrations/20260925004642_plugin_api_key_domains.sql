-- Keep embed metadata alongside hashed API keys and bind browser use to a site.
alter table public.public_api_keys
  add column if not exists allowed_origin text,
  add column if not exists embed_installed boolean not null default false,
  add column if not exists embed_last_seen timestamptz,
  add column if not exists embed_config jsonb not null default '{}'::jsonb;

alter table public.public_api_keys enable row level security;
revoke all on table public.public_api_keys from anon, public;
grant select, insert, update, delete on table public.public_api_keys to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'public_api_keys'
  loop
    execute format('drop policy %I on %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  end loop;
end;
$$;

create policy public_api_keys_owner_all on public.public_api_keys
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
