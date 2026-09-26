-- Run on staging after add_atomic_rate_limiter. Every fixture is rolled back.
begin;
set local role service_role;

do $$
declare
  config record;
  result record;
  first_reset timestamptz;
  expected_reset timestamptz;
  key_prefix text := '__rate_limit_verify__:' || txid_current()::text || ':';
  bucket_key text;
  calls integer;
  rejected integer := 0;
begin
  for config in select * from (values ('scan', 3, 86400), ('content', 10, 86400), ('chat', 30, 3600)) as limits(action, quota, window_seconds)
  loop
    bucket_key := key_prefix || config.action;
    for calls in 1..config.quota loop
      select * into strict result from public.consume_rate_limit(bucket_key, config.quota, config.window_seconds);
      if result.allowed is not true or result.remaining <> config.quota - calls then
        raise exception 'Incorrect allowance for % request %', config.action, calls;
      end if;
      if calls = 1 then
        first_reset := result.reset_at;
        if first_reset < clock_timestamp() + make_interval(secs => config.window_seconds - 5)
          or first_reset > clock_timestamp() + make_interval(secs => config.window_seconds) then
          raise exception 'Invalid first reset time for %', config.action;
        end if;
      end if;
    end loop;
    for calls in 1..2 loop
      select * into strict result from public.consume_rate_limit(bucket_key, config.quota, config.window_seconds);
      if result.allowed is not false or result.remaining <> 0 or result.reset_at <> first_reset then
        raise exception 'Over-quota request was not rejected correctly for %', config.action;
      end if;
    end loop;
    if (select cardinality(request_times) from geothority_private.rate_limit_buckets where identifier = bucket_key) <> config.quota then
      raise exception 'Denied requests expanded bucket for %', config.action;
    end if;
  end loop;

  select * into strict result from public.consume_rate_limit(key_prefix || 'scan:other-user', 3, 86400);
  if result.allowed is not true or result.remaining <> 2 then
    raise exception 'An independent identifier inherited another quota';
  end if;

  -- One expired request releases exactly one place in a strict rolling window.
  bucket_key := key_prefix || 'recovery';
  perform public.consume_rate_limit(bucket_key, 3, 60);
  expected_reset := clock_timestamp() + interval '15 seconds';
  update geothority_private.rate_limit_buckets
  set request_times = array[expected_reset - interval '76 seconds', expected_reset - interval '60 seconds', expected_reset - interval '25 seconds']
  where identifier = bucket_key;
  select * into strict result from public.consume_rate_limit(bucket_key, 3, 60);
  if result.allowed is not true or result.remaining <> 0 or result.reset_at <> expected_reset then
    raise exception 'Rolling expiration did not release exactly one place';
  end if;
  select * into strict result from public.consume_rate_limit(bucket_key, 3, 60);
  if result.allowed is not false then raise exception 'Rolling window over-consumed released place'; end if;

  -- A lower configured limit waits until enough retained requests expire.
  select request_times[3] + interval '60 seconds' into expected_reset
  from geothority_private.rate_limit_buckets where identifier = bucket_key;
  select * into strict result from public.consume_rate_limit(bucket_key, 1, 60);
  if result.allowed is not false or result.reset_at <> expected_reset then
    raise exception 'Reduced quota returned an early reset';
  end if;

  update geothority_private.rate_limit_buckets
  set request_times = array[clock_timestamp() - interval '61 seconds']
  where identifier = bucket_key;
  select * into strict result from public.consume_rate_limit(bucket_key, 3, 60);
  if result.allowed is not true or result.remaining <> 2 then raise exception 'Expired bucket did not recover'; end if;

  begin perform public.consume_rate_limit(null, 3, 60); exception when invalid_parameter_value then rejected := rejected + 1; end;
  begin perform public.consume_rate_limit('', 3, 60); exception when invalid_parameter_value then rejected := rejected + 1; end;
  begin perform public.consume_rate_limit(repeat('x', 513), 3, 60); exception when invalid_parameter_value then rejected := rejected + 1; end;
  begin perform public.consume_rate_limit(key_prefix || 'invalid', 0, 60); exception when invalid_parameter_value then rejected := rejected + 1; end;
  begin perform public.consume_rate_limit(key_prefix || 'invalid', 1001, 60); exception when invalid_parameter_value then rejected := rejected + 1; end;
  begin perform public.consume_rate_limit(key_prefix || 'invalid', 3, 0); exception when invalid_parameter_value then rejected := rejected + 1; end;
  begin perform public.consume_rate_limit(key_prefix || 'invalid', 3, 604801); exception when invalid_parameter_value then rejected := rejected + 1; end;
  if rejected <> 7 then raise exception 'Invalid inputs were accepted'; end if;
end;
$$;

reset role;
set local role anon;
do $$
declare denied integer := 0;
begin
  begin perform public.consume_rate_limit('__rate_limit_verify__:forbidden', 1, 60); exception when insufficient_privilege then denied := denied + 1; end;
  begin perform 1 from geothority_private.rate_limit_buckets; exception when insufficient_privilege then denied := denied + 1; end;
  if denied <> 2 then raise exception 'anon could call the limiter or read buckets'; end if;
end;
$$;

reset role;
set local role authenticated;
do $$
declare denied integer := 0;
begin
  begin perform public.consume_rate_limit('__rate_limit_verify__:forbidden', 1, 60); exception when insufficient_privilege then denied := denied + 1; end;
  begin perform 1 from geothority_private.rate_limit_buckets; exception when insufficient_privilege then denied := denied + 1; end;
  if denied <> 2 then raise exception 'authenticated could call the limiter or read buckets'; end if;
end;
$$;

reset role;
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'geothority_private.rate_limit_buckets'::regclass)
    or (select prosecdef from pg_proc where oid = 'public.consume_rate_limit(text,integer,integer)'::regprocedure)
    or has_table_privilege('service_role', 'geothority_private.rate_limit_buckets', 'DELETE')
    or has_schema_privilege('service_role', 'geothority_private', 'CREATE') then
    raise exception 'Limiter security or least-privilege invariant failed';
  end if;
end;
$$;
rollback;

select 'rate-limit quota, rolling recovery, validation and access checks passed' as verification,
  (select count(*) from geothority_private.rate_limit_buckets where identifier like '__rate_limit_verify__:%') as remaining_test_rows;
