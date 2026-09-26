const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadTsModule, createSupabaseMock, jsonRequest } = require('./route-test-helpers.cjs');

const { ensureUserProfileExists } = loadTsModule('src/lib/supabase/ensure-user-profile.ts');
const user = { id: 'tenant-a' };
const businessInput = {
  businessName: '  Test Business  ', city: 'Stuart', state: 'FL', website: 'https://example.com',
  plan: 'agency', role: 'admin',
};
const existingProfile = {
  id: user.id, onboarding_completed: false, business_name: 'Test Business', city: 'Stuart', state: 'FL',
};

function profileDatabase(initialProfile = null, { zeroRowUpdate = false } = {}) {
  let profile = initialProfile && structuredClone(initialProfile);
  return createSupabaseMock(query => {
    if (query.table === 'user_profiles') {
      if (query.operation === 'upsert') {
        const existed = Boolean(profile);
        profile ||= { plan: 'free', ...query.values };
        return { data: existed ? null : profile, error: null };
      }
      if (query.operation === 'update') {
        if (zeroRowUpdate) return { data: null, error: null };
        if (profile) profile = { ...profile, ...query.values };
      }
      return { data: profile, error: null };
    }
    if (query.table === 'business_profiles') {
      return { data: { id: 'canonical-1', ...query.values }, error: null };
    }
    throw new Error(`Unexpected table: ${query.table}`);
  });
}

function loadBusinessRoute(database) {
  return loadTsModule('src/app/api/business-profile/route.ts', {
    '@/lib/supabase/server': { createServerSupabase: async () => database },
    '@/lib/supabase/ensure-user-profile': { ensureUserProfileExists },
  });
}
function loadMilestoneRoute(database, recordMilestone) {
  return loadTsModule('src/app/api/activation/milestone/route.ts', {
    '@/lib/supabase/server': { createServerSupabase: async () => database },
    '@/lib/supabase/ensure-user-profile': { ensureUserProfileExists },
    '@/lib/journey-events': { recordJourneyMilestone: recordMilestone },
  });
}
function finishRequest() {
  return jsonRequest('/api/activation/milestone', { eventName: 'onboarding_completed' });
}

test('new users receive a verified own profile without supplied billing or role fields', async () => {
  const database = profileDatabase();
  const result = await ensureUserProfileExists(database, user);
  assert.equal(result.error, null);
  assert.equal(result.created, true);
  assert.equal(result.onboardingCompleted, false);
  const insertion = database.calls.find(query => query.operation === 'upsert');
  assert.equal(insertion.values.id, user.id);
  assert.equal(insertion.values.onboarding_completed, false);
  assert.equal('plan' in insertion.values, false);
  assert.equal('role' in insertion.values, false);
  assert.equal(insertion.options.ignoreDuplicates, true);
  assert.ok(database.calls.at(-1).filters.some(filter => filter[1] === 'id' && filter[2] === user.id));
});

test('profile bootstrap preserves an existing billing plan and completed onboarding', async () => {
  const database = profileDatabase({ id: user.id, plan: 'authority', onboarding_completed: true });
  const result = await ensureUserProfileExists(database, user);
  assert.equal(result.created, false);
  assert.equal(result.onboardingCompleted, true);
  assert.equal(database.calls.some(query => query.operation !== 'select'), false);
});

test('profile bootstrap rejects a zero-row save that cannot be verified', async () => {
  const database = createSupabaseMock(() => ({ data: null, error: null }));
  const result = await ensureUserProfileExists(database, user);
  assert.ok(result.error);
  assert.equal(result.created, false);
});

test('canonical business save bootstraps both profiles and excludes role and plan from writes', async () => {
  const database = profileDatabase();
  const response = await loadBusinessRoute(database).POST(jsonRequest('/api/business-profile', businessInput));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).setupRequired, false);
  const userWrite = database.calls.find(query => query.table === 'user_profiles' && query.operation === 'update');
  assert.deepEqual(userWrite.values, {
    business_name: 'Test Business', city: 'Stuart', state: 'FL', website_url: 'https://example.com',
  });
  assert.ok(userWrite.filters.some(filter => filter[1] === 'id' && filter[2] === user.id));
  const businessWrite = database.calls.find(query => query.table === 'business_profiles' && query.operation === 'upsert');
  assert.equal(businessWrite.values.user_id, user.id);
  assert.equal(businessWrite.values.business_name, 'Test Business');
  assert.equal('plan' in businessWrite.values, false);
  assert.equal('role' in businessWrite.values, false);
});

test('business save rejects a zero-row account update instead of reporting successful onboarding', async context => {
  context.mock.method(console, 'error', () => {});
  const database = profileDatabase({ id: user.id, onboarding_completed: false }, { zeroRowUpdate: true });
  const response = await loadBusinessRoute(database).POST(jsonRequest('/api/business-profile', businessInput));
  assert.equal(response.status, 500);
  assert.equal(database.calls.some(query => query.table === 'business_profiles'), false);
});

test('missing business details prevent onboarding completion and follow-up events', async () => {
  const database = profileDatabase();
  let events = 0;
  const route = loadMilestoneRoute(database, async () => { events++; });
  const response = await route.POST(finishRequest());
  assert.equal(response.status, 409);
  assert.equal(events, 0);
  assert.equal(database.calls.some(query => query.operation === 'update'), false);
});

test('a zero-row onboarding completion update cannot report success or trigger follow-up events', async context => {
  context.mock.method(console, 'error', () => {});
  const database = profileDatabase(existingProfile, { zeroRowUpdate: true });
  let events = 0;
  const response = await loadMilestoneRoute(database, async () => { events++; }).POST(finishRequest());
  assert.equal(response.status, 500);
  assert.equal(events, 0);
});

test('onboarding success follows verified completion of the authenticated user profile', async () => {
  const database = profileDatabase(existingProfile);
  const events = [];
  const response = await loadMilestoneRoute(database, async (...args) => { events.push(args); }).POST(finishRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(events, [[user.id, 'onboarding_completed']]);
  const update = database.calls.find(query => query.operation === 'update');
  assert.deepEqual(update.values, { onboarding_completed: true });
  assert.ok(update.filters.some(filter => filter[1] === 'id' && filter[2] === user.id));
});

test('beta signup creates a profile without requiring an auth callback or database trigger', async context => {
  const previousCode = process.env.GEOTHORITY_BETA_SIGNUP_CODE;
  context.after(() => {
    if (previousCode === undefined) delete process.env.GEOTHORITY_BETA_SIGNUP_CODE;
    else process.env.GEOTHORITY_BETA_SIGNUP_CODE = previousCode;
  });
  process.env.GEOTHORITY_BETA_SIGNUP_CODE = 'test-only-beta-code';
  const database = profileDatabase();
  database.auth.admin = { createUser: async () => ({ data: { user }, error: null }) };
  const route = loadTsModule('src/app/api/auth/beta-signup/route.ts', {
    '@/lib/supabase/server': { createOptionalServiceClient: () => database },
    '@/lib/supabase/ensure-user-profile': { ensureUserProfileExists },
  });
  const response = await route.POST(jsonRequest('/api/auth/beta-signup', {
    email: 'test@example.com', password: 'test-only-password', betaCode: 'test-only-beta-code',
  }));
  assert.equal(response.status, 200);
  assert.ok(database.calls.some(query => query.table === 'user_profiles' && query.operation === 'upsert'));
});
