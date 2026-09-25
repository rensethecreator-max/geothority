const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadTsModule, createSupabaseMock, jsonRequest } = require('./route-test-helpers.cjs');

function loadCheckout(database, billingClient, stripe) {
  return loadTsModule('src/app/api/stripe/checkout/route.ts', {
    '@/lib/supabase/server': {
      createServerSupabase: async () => database,
      createOptionalServiceClient: () => billingClient,
    },
    '@/lib/stripe': {
      PLANS: { growth: { annualPriceId: 'price_test_annual' } },
      getPlanPriceId: () => 'price_test_growth',
      requireStripe: () => stripe,
    },
  });
}

function checkoutRequest() {
  return jsonRequest('/api/stripe/checkout', { plan: 'growth' });
}

test('checkout returns 503 before contacting Stripe when its server database client is unavailable', async () => {
  const database = createSupabaseMock(() => { throw new Error('Unconfigured checkout must not query profiles'); });
  const stripe = {
    customers: { create: async () => { throw new Error('Unconfigured checkout must not create customers'); } },
    checkout: { sessions: { create: async () => { throw new Error('Unconfigured checkout must not create sessions'); } } },
  };
  const response = await loadCheckout(database, null, stripe).POST(checkoutRequest());
  assert.equal(response.status, 503);
  assert.equal(database.calls.length, 0);
});

test('checkout persists the verified user customer ID using only the service client before creating a session', async () => {
  const database = createSupabaseMock(() => ({ data: null, error: null }));
  const billingClient = createSupabaseMock(() => ({ data: { id: 'tenant-a' }, error: null }));
  let idempotencyKey;
  let checkoutCustomer;
  const stripe = {
    customers: { create: async (values, options) => {
      assert.equal(values.metadata.supabase_id, 'tenant-a');
      idempotencyKey = options.idempotencyKey;
      return { id: 'cus_test_123' };
    } },
    checkout: { sessions: { create: async values => {
      assert.equal(billingClient.calls.length, 1);
      checkoutCustomer = values.customer;
      return { url: 'https://checkout.stripe.com/test-fixture' };
    } } },
  };
  const response = await loadCheckout(database, billingClient, stripe).POST(checkoutRequest());
  assert.equal(response.status, 200);
  assert.equal(checkoutCustomer, 'cus_test_123');
  assert.equal(idempotencyKey, 'geothority-customer-tenant-a');
  assert.ok(database.calls.every(query => query.operation === 'select'));
  assert.deepEqual(billingClient.calls[0].values, { id: 'tenant-a', stripe_customer_id: 'cus_test_123' });
});

test('checkout stops before creating a payment session when its customer record cannot be saved', async context => {
  context.mock.method(console, 'error', () => {});
  const database = createSupabaseMock(() => ({ data: null, error: null }));
  const billingClient = createSupabaseMock(() => ({ data: null, error: { message: 'Write rejected' } }));
  let paymentSessions = 0;
  const stripe = {
    customers: { create: async () => ({ id: 'cus_test_123' }) },
    checkout: { sessions: { create: async () => { paymentSessions++; return { url: 'https://checkout.stripe.com/test-fixture' }; } } },
  };
  const response = await loadCheckout(database, billingClient, stripe).POST(checkoutRequest());
  assert.equal(response.status, 500);
  assert.equal(paymentSessions, 0);
});
