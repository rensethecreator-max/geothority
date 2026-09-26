-- A shared sliding-window limiter for server routes when Redis is not configured.
-- One bounded row per action/caller; never expose these identifiers to clients.
create schema if not exists geothority_private;
revoke all on schema geothority_private from public, anon, authenticated;
grant usage on schema geothority_private to service_role;

create table if not exists geothority_private.rate_limit_buckets (
  identifier text primary key check (octet_length(identifier) between 1 and 512),
  request_times timestamptz[] not null default '{}',
  updated_at timestamptz not null default clock_timestamp(),
  constraint rate_limit_bucket_bounded check (cardinality(request_times) <= 1000)
);

alter table geothority_private.rate_limit_buckets enable row level security;
revoke all on table geothority_private.rate_limit_buckets from public, anon, authenticated, service_role;
grant select, insert, update on table geothority_private.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_times timestamptz[];
  v_now timestamptz;
  v_window interval;
  v_count integer;
begin
  if p_identifier is null or octet_length(p_identifier) not between 1 and 512 then
    raise exception 'Rate limit identifier must contain 1 to 512 bytes' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 1000 then
    raise exception 'Rate limit must be between 1 and 1000' using errcode = '22023';
  end if;
  if p_window_seconds is null or p_window_seconds not between 1 and 604800 then
    raise exception 'Rate limit window must be between 1 and 604800 seconds' using errcode = '22023';
  end if;

  insert into geothority_private.rate_limit_buckets (identifier)
  values (p_identifier)
  on conflict (identifier) do nothing;

  -- Serialize every consume for this identifier, including concurrent first use.
  select bucket.request_times into strict v_times
  from geothority_private.rate_limit_buckets as bucket
  where bucket.identifier = p_identifier
  for update;

  -- Capture time after acquiring the lock, rather than at transaction start.
  v_now := clock_timestamp();
  v_window := make_interval(secs => p_window_seconds);
  select coalesce(array_agg(request_at order by request_at), '{}'::timestamptz[])
  into v_times
  from unnest(v_times) as requests(request_at)
  where request_at > v_now - v_window;

  v_count := cardinality(v_times);
  allowed := v_count < p_limit;
  if allowed then
    v_times := array_append(v_times, v_now);
    v_count := v_count + 1;
  end if;

  update geothority_private.rate_limit_buckets as bucket
  set request_times = v_times, updated_at = v_now
  where bucket.identifier = p_identifier;

  remaining := greatest(0, p_limit - v_count);
  -- If a configured limit decreases, wait until enough entries expire.
  reset_at := v_times[greatest(1, v_count - p_limit + 1)] + v_window;
  return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Server-only atomic sliding window. Prefix the identifier with the action; call via a service-role client.';
