const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadTsModule, jsonRequest } = require('./route-test-helpers.cjs');

const resetAt = '2026-09-27T12:00:00.000Z';
const reset = Date.parse(resetAt);
const unavailable = { allowed: false, remaining: 0, reset: 0, unavailable: true };

function loadRateLimiter(context, {
  redisConfigured = false,
  nodeEnv = 'production',
  vercel,
  database = null,
  redisResult = { success: true, remaining: 2, reset },
  redisError,
} = {}) {
  const environment = {
    NODE_ENV: nodeEnv,
    VERCEL: vercel,
    UPSTASH_REDIS_REST_URL: redisConfigured ? 'https://redis.example.test' : undefined,
    UPSTASH_REDIS_REST_TOKEN: redisConfigured ? 'test-only-redis-token' : undefined,
  };
  const previous = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  context.mock.method(console, 'error', () => {});

  const redisCalls = [];
  const redisConfigurations = [];
  let serviceClientCalls = 0;
  class Ratelimit {
    static slidingWindow(limit, window) {
      const [duration, unit] = window.split(' ');
      return { limit, windowSeconds: Number(duration) * { s: 1, h: 3600, d: 86400 }[unit] };
    }
    constructor(configuration) {
      redisConfigurations.push(configuration);
    }
    async limit(identifier) {
      redisCalls.push(identifier);
      if (redisError) throw redisError;
      return redisResult;
    }
  }
  const limiter = loadTsModule('src/lib/ratelimit.ts', {
    '@upstash/ratelimit': { Ratelimit },
    '@upstash/redis': { Redis: class Redis {} },
    '@/lib/supabase/server': {
      createOptionalServiceClient() {
        serviceClientCalls++;
        return database;
      },
    },
  });
  return { ...limiter, redisCalls, redisConfigurations, serviceClientCalls: () => serviceClientCalls };
}

test('database fallback preserves each scope quota and returns the durable reset time', async context => {
  const calls = [];
  const database = {
    async rpc(name, parameters) {
      calls.push({ name, parameters });
      return { data: [{ allowed: true, remaining: parameters.p_limit - 1, reset_at: resetAt }], error: null };
    },
  };
  const limiter = loadRateLimiter(context, { database });
  for (const [scope, limit, windowSeconds] of [['scan', 3, 86400], ['content', 10, 86400], ['chat', 30, 3600]]) {
    const result = await limiter.checkRateLimit(limiter[`${scope}Ratelimit`], `${scope}:tenant-a`);
    assert.deepEqual(result, { allowed: true, remaining: limit - 1, reset });
    assert.deepEqual(calls.at(-1), {
      name: 'consume_rate_limit',
      parameters: { p_identifier: `${scope}:tenant-a`, p_limit: limit, p_window_seconds: windowSeconds },
    });
  }
  assert.equal(calls.length, 3);
  assert.equal(limiter.redisCalls.length, 0);
});

test('an exhausted database quota is a normal denial rather than an unavailable dependency', async context => {
  const limiter = loadRateLimiter(context, {
    database: { rpc: async () => ({ data: [{ allowed: false, remaining: 0, reset_at: resetAt }], error: null }) },
  });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), {
    allowed: false, remaining: 0, reset,
  });
});

test('missing and malformed database results fail closed', async context => {
  let rpcData;
  const limiter = loadRateLimiter(context, {
    database: { rpc: async () => ({ data: rpcData, error: null }) },
  });
  const validRow = { allowed: true, remaining: 2, reset_at: resetAt };
  const malformedResults = [
    null,
    [],
    validRow,
    [validRow, validRow],
    [{}],
    [{ ...validRow, allowed: 'true' }],
    [{ ...validRow, remaining: '2' }],
    [{ ...validRow, remaining: -1 }],
    [{ ...validRow, remaining: 1.5 }],
    [{ ...validRow, remaining: 3 }],
    [{ ...validRow, remaining: NaN }],
    [{ ...validRow, remaining: Infinity }],
    [{ ...validRow, reset_at: 'not-a-timestamp' }],
    [{ ...validRow, reset_at: null }],
    [{ ...validRow, allowed: false, remaining: 2 }],
  ];
  for (const data of malformedResults) {
    rpcData = data;
    assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), unavailable);
  }
});

test('a database RPC error overrides any allowed row and fails closed', async context => {
  const limiter = loadRateLimiter(context, {
    database: { rpc: async () => ({
      data: [{ allowed: true, remaining: 2, reset_at: resetAt }],
      error: { message: 'RPC is unavailable' },
    }) },
  });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), unavailable);
});

test('a database transport exception fails closed without rejecting the caller', async context => {
  const limiter = loadRateLimiter(context, {
    database: { rpc: async () => { throw new Error('Connection unavailable'); } },
  });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), unavailable);
});

test('production fails closed when neither rate-limit backend is configured', async context => {
  const limiter = loadRateLimiter(context);
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), unavailable);
});

test('Vercel cannot use the development bypass when neither backend is configured', async context => {
  const limiter = loadRateLimiter(context, { nodeEnv: 'development', vercel: '1' });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), unavailable);
});

test('local development retains its existing bypass only when no backend is configured', async context => {
  const limiter = loadRateLimiter(context, { nodeEnv: 'development' });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), {
    allowed: true, remaining: 999, reset: 0,
  });
});

test('configured Redis remains preferred and preserves the existing scope quotas', async context => {
  const limiter = loadRateLimiter(context, {
    redisConfigured: true,
    database: { rpc: async () => { throw new Error('Redis must not consume a second quota'); } },
  });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), {
    allowed: true, remaining: 2, reset,
  });
  assert.deepEqual(limiter.redisCalls, ['scan:tenant-a']);
  assert.equal(limiter.serviceClientCalls(), 0);
  assert.deepEqual(limiter.redisConfigurations.map(configuration => ({
    prefix: configuration.prefix, limiter: configuration.limiter,
  })), [
    { prefix: 'geo:scan', limiter: { limit: 3, windowSeconds: 86400 } },
    { prefix: 'geo:content', limiter: { limit: 10, windowSeconds: 86400 } },
    { prefix: 'geo:chat', limiter: { limit: 30, windowSeconds: 3600 } },
  ]);
});

test('an exhausted Redis quota stays denied without database fallback', async context => {
  const limiter = loadRateLimiter(context, {
    redisConfigured: true,
    redisResult: { success: false, remaining: 0, reset },
    database: { rpc: async () => { throw new Error('Denied quotas must not fail over'); } },
  });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), {
    allowed: false, remaining: 0, reset,
  });
  assert.equal(limiter.serviceClientCalls(), 0);
});

test('a Redis exception fails closed without switching to an unused database quota', async context => {
  const limiter = loadRateLimiter(context, {
    redisConfigured: true,
    redisError: new Error('Redis unavailable'),
    database: { rpc: async () => ({ data: [{ allowed: true, remaining: 2, reset_at: resetAt }], error: null }) },
  });
  assert.deepEqual(await limiter.checkRateLimit(limiter.scanRatelimit, 'scan:tenant-a'), unavailable);
  assert.deepEqual(limiter.redisCalls, ['scan:tenant-a']);
  assert.equal(limiter.serviceClientCalls(), 0);
});

for (const scope of ['scan', 'chat']) {
  test(`${scope} route distinguishes unavailable rate limiting from an exhausted quota before downstream work`, async context => {
    let rpcResult = { data: null, error: { message: 'Rate-limit database unavailable' } };
    const identifiers = [];
    const limiter = loadRateLimiter(context, {
      database: { rpc: async (_, parameters) => {
        identifiers.push(parameters.p_identifier);
        return rpcResult;
      } },
    });
    const downstreamCalls = [];
    const unexpectedWork = name => () => {
      downstreamCalls.push(name);
      throw new Error(`Blocked requests must not call ${name}`);
    };
    const route = loadTsModule(`src/app/api/${scope}/route.ts`, {
      '@/lib/ratelimit': limiter,
      '@/lib/supabase/server': {
        createServerSupabase: async () => ({
          auth: { getUser: async () => ({ data: { user: { id: 'tenant-a' } } }) },
          from: unexpectedWork('database tables'),
        }),
      },
      '@/lib/scanner': {
        scanWebsite: unexpectedWork('website scanner'),
        WebsiteScanError: class WebsiteScanError extends Error {},
      },
      '@/lib/journey-events': { recordJourneyMilestone: unexpectedWork('journey milestone') },
      '@/lib/reputation/business-identity': { getReputationBusinessIdentity: unexpectedWork('business identity') },
      '@/lib/openai': {
        DEFAULT_LLM_MODEL: 'test-model',
        WILL_SYSTEM_PROMPT: 'Test system prompt',
        openai: { chat: { completions: { create: unexpectedWork('model completion') } } },
      },
    });
    const body = scope === 'scan'
      ? { url: 'https://example.com', businessName: 'Fixture Agency', city: 'Austin', state: 'TX' }
      : { messages: [{ role: 'user', content: 'How can I improve my local search visibility?' }] };

    const unavailableResponse = await route.POST(jsonRequest(`/api/${scope}`, body));
    assert.equal(unavailableResponse.status, 503);
    const unavailableBody = await unavailableResponse.json();
    assert.match(unavailableBody.error, /temporarily unavailable/i);
    assert.equal(Object.hasOwn(unavailableBody, 'reset'), false);

    rpcResult = { data: [{ allowed: false, remaining: 0, reset_at: resetAt }], error: null };
    const exhaustedResponse = await route.POST(jsonRequest(`/api/${scope}`, body));
    assert.equal(exhaustedResponse.status, 429);
    const exhaustedBody = await exhaustedResponse.json();
    assert.match(exhaustedBody.error, scope === 'scan' ? /Rate limit exceeded/ : /Too many messages/);
    if (scope === 'scan') assert.equal(exhaustedBody.reset, reset);
    assert.deepEqual(identifiers, [`${scope}:tenant-a`, `${scope}:tenant-a`]);
    assert.deepEqual(downstreamCalls, []);
  });
}
