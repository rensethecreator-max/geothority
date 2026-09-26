-- Billing entitlements come from the server's Stripe integration. RLS limits
-- owners to their own rows; column grants separately prevent self-upgrades.
revoke insert, update on table public.user_profiles from public, anon, authenticated;

do $profile_column_access$
declare
  all_columns text;
  editable_columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into all_columns
    from information_schema.columns
    where table_schema = 'public' and table_name = 'user_profiles';

  -- Remove any pre-existing column grants as well as table grants. Otherwise a
  -- prior grant on a protected column would remain effective after the revoke.
  execute format(
    'revoke insert (%1$s), update (%1$s) on table public.user_profiles from public, anon, authenticated',
    all_columns
  );

  -- Some legacy bootstraps do not yet have the automation execution flags.
  -- Grant only named, present columns; new billing/admin columns stay denied.
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into editable_columns
    from information_schema.columns
    where table_schema = 'public' and table_name = 'user_profiles'
      and column_name = any(array[
        'id', 'business_name', 'city', 'state', 'website_url',
        'onboarding_completed', 'cms_type', 'cms_credentials',
        'automation_policies', 'auto_exec_enabled', 'auto_exec_dry_run'
      ]);

  execute format(
    'grant insert (%1$s), update (%1$s) on table public.user_profiles to authenticated',
    editable_columns
  );
end
$profile_column_access$;

-- Existing owner RLS still controls which rows can be read or changed.
-- Table SELECT remains so profile screens may read their own plan/status.
grant select on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.user_profiles to service_role;
