const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');

// Next aliases server-only during server builds. Match that marker in this
// Node test process while keeping the actual safe fetch and URL checks intact.
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'server-only') return {};
  return originalLoad.apply(this, arguments);
};
const realSafeFetch = require('../../src/lib/security/safe-url-fetch.ts');
let pageFetcher = (...args) => realSafeFetch.fetchPublicText(...args);
let fromTable = () => { throw new Error('Unexpected database write/read'); };
const completions = [];
const userId = 'scan-unit-test-user';

Module._load = function (request) {
  if (request === 'server-only') return {};
  if (request === '@/lib/security/safe-url-fetch') return { fetchPublicText: (...args) => pageFetcher(...args) };
  if (request === '@/lib/supabase/server') return {
    createServerSupabase: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
      from: (...args) => fromTable(...args),
    }),
  };
  if (request === '@/lib/ratelimit') return { scanRatelimit: {}, checkRateLimit: async () => ({ allowed: true }) };
  if (request === '@/lib/journey-events') return { recordJourneyMilestone: async () => {} };
  if (request === '@/lib/openai') return {
    DEFAULT_LLM_MODEL: 'test-model',
    openai: { chat: { completions: { create: async (request) => {
      completions.push(request);
      return { choices: [{ message: { content: '{}' } }] };
    } } } },
  };
  return originalLoad.apply(this, arguments);
};
const { scanWebsite, WebsiteScanError } = require('../../src/lib/scanner.ts');
const scanRoute = require('../../src/app/api/scan/route.ts');
const fixRoute = require('../../src/app/api/scan/fix-all/route.ts');
Module._load = originalLoad;

const scanInput = { url: 'https://example.com', businessName: 'Fixture Agency', city: 'Stuart', state: 'FL' };
function request(body) {
  return new Request('https://staging.example.com/api/scan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

function useScanFixture(scan) {
  const saved = [];
  completions.length = 0;
  fromTable = (table) => {
    const query = {
      select: () => query,
      eq: () => query,
      single: async () => ({ data: table === 'scans' ? scan : null, error: null }),
      insert: async (value) => { saved.push({ table, value }); return { error: null }; },
    };
    return query;
  };
  return saved;
}

const healthyScan = {
  id: 'scan-fixture', user_id: userId, url: scanInput.url,
  business_name: scanInput.businessName, city: scanInput.city, state: scanInput.state,
  layer_scores: { layer1: 100, layer2: 100, layer3: 100, layer4: 100, layer5: 100 },
  quick_wins: [],
  raw_scan_data: {
    hasLocalBusinessSchema: true,
    title: 'Fixture Agency in Stuart, Florida',
    description: 'Fixture Agency provides local insurance services throughout Stuart and the surrounding Florida communities.',
  },
};

test('private and invalid URLs reject before a score can be produced', async () => {
  for (const url of ['http://127.0.0.1', 'http://169.254.169.254', 'file:///etc/passwd']) {
    await assert.rejects(scanWebsite(url, 'Fixture', 'Stuart', 'FL'), error => error instanceof WebsiteScanError && error.status === 400);
  }
});

test('main-page fetch rejection does not turn into an empty-site score', async () => {
  pageFetcher = async () => { throw new Error('Website responded with HTTP 403'); };
  await assert.rejects(scanWebsite(scanInput.url, 'Fixture', 'Stuart', 'FL'), error => {
    assert.equal(error.status, 422);
    assert.match(error.cause.message, /HTTP 403/);
    return true;
  });
});

test('a successful website scan has no invented competitors and keeps the final URL', async () => {
  pageFetcher = async (url) => {
    if (url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml')) throw new Error('Optional file unavailable');
    return { finalUrl: 'https://www.example.com/', text: '<!doctype html><html><head><title>Fixture Agency in Stuart</title></head><body><h1>Fixture Agency</h1><p>Call 772-555-0100 at 100 Main Street.</p></body></html>' };
  };
  const result = await scanWebsite('example.com', 'Fixture Agency', 'Stuart', 'FL');
  assert.equal(result.url, 'https://www.example.com/');
  assert.equal(result.rawScanData.title, 'Fixture Agency in Stuart');
  assert.equal(result.rawScanData.hasRobotsTxt, false);
  assert.deepEqual(result.competitorGaps, []);
});

test('scan API returns failure without saving when the main page is unavailable', async (context) => {
  context.mock.method(console, 'error', () => {});
  let databaseCalls = 0;
  fromTable = () => { databaseCalls++; throw new Error('Must not access database after failed scan'); };
  pageFetcher = async () => { throw new Error('DNS lookup failed'); };
  const response = await scanRoute.POST(request(scanInput));
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /couldn't read this website/);
  assert.equal(databaseCalls, 0);
});

test('scan API rejects non-text request fields', async () => {
  const response = await scanRoute.POST(request({ ...scanInput, city: { value: 'Stuart' } }));
  assert.equal(response.status, 400);
});

test('fix-all recognizes healthy canonical layer scores without generating unnecessary fixes', async () => {
  const saved = useScanFixture(healthyScan);
  const response = await fixRoute.POST(request({ scanId: healthyScan.id }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.totalFixes, 0);
  assert.equal(completions.length, 0);
  assert.equal(saved[0].value.auto_applied_count, 0);
});

test('fix-all uses raw evidence for missing schema and metadata and includes the scan city', async () => {
  useScanFixture({ ...healthyScan, raw_scan_data: { ...healthyScan.raw_scan_data, hasLocalBusinessSchema: false, description: '' } });
  const response = await fixRoute.POST(request({ scanId: healthyScan.id }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.fixes.map(fix => fix.type).sort(), ['meta_tags', 'schema']);
  assert.equal(completions.length, 2);
  assert.ok(completions.some(completion => completion.messages[0].content.includes('Stuart, FL')));
});
