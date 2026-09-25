const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NextRequest } = require('next/server');
const { loadTsModule, createSupabaseMock, jsonRequest } = require('./route-test-helpers.cjs');

const post = {
  id: 'post-1', status: 'approved', body: 'A business update.', title: 'Update',
  cta_type: null, cta_url: null, image_url: null, post_type: 'standard',
};
const googleSession = { user: { id: 'tenant-a' }, provider_token: 'test-only-token' };

function postDatabaseQuery(query) {
  return query.table === 'gbp_profiles'
    ? { data: [{ google_account_id: 'accounts/123', google_location_id: 'locations/456' }], error: null }
    : { data: post, error: null };
}

function loadPostRoute(database) {
  return loadTsModule('src/app/api/gbp/posts/route.ts', {
    '@/lib/supabase/server': { createServerSupabase: async () => database },
    '@/lib/plan-gate': { requirePlan: async () => ({ user: { id: 'tenant-a' } }) },
    '@/lib/automation-policies': { getAutomationPolicy: async () => ({}), isAutoAllowed: () => true },
  });
}

function publishRequest() {
  return jsonRequest('/api/gbp/posts', { action: 'publish', postId: post.id });
}

const template = {
  id: 'service', category: 'service', categoryLabel: 'Service', icon: '*',
  templateText: 'Tell us about your experience.', isDefault: true, usageCount: 0,
};
function loadTemplateRoute(database) {
  return loadTsModule('src/app/api/reputation/templates/route.ts', {
    '@/lib/supabase/server': { createServerSupabase: async () => database },
    '@/lib/reputation/defaults': { DEFAULT_REPUTATION_TEMPLATES: [] },
  });
}

test('a disconnected Google account cannot report a successful publication', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not publish without Google credentials'); });
  const database = createSupabaseMock(postDatabaseQuery);
  const response = await loadPostRoute(database).POST(publishRequest());
  assert.equal(response.status, 409);
  assert.equal(database.calls.some(query => query.operation === 'update'), false);
});

test('Google publication uses the localPosts endpoint and updates only the owned post with supported fields', async (context) => {
  let publicationUrl;
  context.mock.method(globalThis, 'fetch', async url => {
    publicationUrl = String(url);
    return Response.json({ name: 'accounts/123/locations/456/localPosts/789' });
  });
  const database = createSupabaseMock(postDatabaseQuery, { session: googleSession });
  const response = await loadPostRoute(database).POST(publishRequest());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).publishedToGoogle, true);
  assert.equal(publicationUrl, 'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/localPosts');
  const saved = database.calls.find(query => query.operation === 'update');
  assert.equal(saved.values.status, 'published');
  assert.ok(saved.values.published_at);
  const supportedColumns = new Set(['status', 'published_at', 'updated_at', 'gbp_post_id']);
  assert.ok(Object.keys(saved.values).every(column => supportedColumns.has(column)));
  assert.ok(saved.filters.some(filter => filter[1] === 'id' && filter[2] === post.id));
  assert.ok(saved.filters.some(filter => filter[1] === 'user_id' && filter[2] === 'tenant-a'));
});

test('a Google API rejection is returned as a failure and cannot mark the post published', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Permission denied' } }, { status: 403 }));
  const database = createSupabaseMock(postDatabaseQuery, { session: googleSession });
  const response = await loadPostRoute(database).POST(publishRequest());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).publishedToGoogle, false);
  assert.equal(database.calls.find(query => query.operation === 'update').values.status, 'failed');
});

test('default reputation template IDs are scoped to a tenant and saved before obsolete rows are deleted', async () => {
  const database = createSupabaseMock(query => ({
    data: query.operation === 'select' ? [{ id: 'tenant-a:service' }, { id: 'obsolete' }] : null,
    error: null,
  }));
  const response = await loadTemplateRoute(database).POST(jsonRequest('/api/reputation/templates', { templates: [template] }));
  assert.equal(response.status, 200);
  const firstWrite = database.calls[0];
  assert.equal(firstWrite.operation, 'upsert');
  assert.equal(firstWrite.values[0].id, 'tenant-a:service');
  assert.equal(firstWrite.values[0].user_id, 'tenant-a');
  const deletion = database.calls.find(query => query.operation === 'delete');
  assert.deepEqual(deletion.filters.find(filter => filter[0] === 'in')[2], ['obsolete']);
  assert.ok(deletion.filters.some(filter => filter[1] === 'user_id' && filter[2] === 'tenant-a'));
});

test('invalid reputation template input cannot mutate stored templates', async () => {
  const database = createSupabaseMock(() => { throw new Error('Invalid input must not reach the database'); });
  const response = await loadTemplateRoute(database).POST(jsonRequest('/api/reputation/templates', {
    templates: [{ ...template, templateText: 42 }],
  }));
  assert.equal(response.status, 400);
  assert.equal(database.calls.length, 0);
});

test('GBP monitoring fails closed for missing cron configuration and unauthorized callers', async context => {
  const previousSecret = process.env.CRON_SECRET;
  context.after(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });
  const route = loadTsModule('src/app/api/cron/gbp-monitor/route.ts', {
    '@supabase/supabase-js': { createClient: () => { throw new Error('Unauthorized calls must not create a database client'); } },
    '@/lib/email-alerts': { sendGBPAlert: async () => { throw new Error('Unauthorized calls must not send email'); } },
  });
  delete process.env.CRON_SECRET;
  let response = await route.GET(new NextRequest('https://staging.example.com/api/cron/gbp-monitor'));
  assert.equal(response.status, 503);
  process.env.CRON_SECRET = 'test-only-secret';
  response = await route.GET(new NextRequest('https://staging.example.com/api/cron/gbp-monitor'));
  assert.equal(response.status, 401);
});
