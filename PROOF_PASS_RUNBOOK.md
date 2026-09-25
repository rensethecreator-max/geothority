# Geothority proof-pass runbook

Use this to verify configuration, database readiness, and customer journeys after a deployment.

## 1) Preflight config audit

```bash
npm run proof:readiness
```

What it checks safely:
- critical env coverage (Supabase, OpenAI, Maps, Foursquare)
- recommended proof-pass env coverage (Stripe, Resend, Google runtime OAuth, reputation queue/webhook secrets, cron secret)
- app URL / auth callback expectations
- optional live HTTP checks when a base URL is provided, including database readiness at `/api/health`

Useful variants:

```bash
npm run proof:readiness -- --env=.env.example --skip-http
npm run proof:readiness -- --base-url=http://localhost:3010
npm run proof:readiness -- --base-url=https://geothority.io
npm run proof:readiness -- --json > tmp/geothority-proof-readiness.json
```

## 2) Build gate

```bash
npm run typecheck
npm run test:security
npm run test:runtime
npm run ops:cron:dispatch:test
npm run build:proof
```

This gives the fastest local signal that the app is still deployable before someone spends time doing live operator checks.

## 3) Local live smoke

Start the app:

```bash
npm run dev
```

Then run:

```bash
npm run proof:readiness -- --base-url=http://localhost:3010
```

Minimum expected live results:
- `/api/healthz` returns 200 for process liveness.
- `/api/health` returns 200 with `status: ready` and `database: connected`; a 503 blocks the authenticated proof pass.
- Protected APIs reject anonymous requests with 401.
- Check integration readiness through the signed-in integration screens.
- output shows the expected `/api/auth/callback` URL

## 4) Operator proof checklist for staging/live pass

### Anonymous checks
- Home page loads without console-breaking errors.
- `/api/health` returns 200 if all critical env is present, or a clear degraded response if not.
- Login page loads and Google sign-in button is visible.
- Auth callback target is exactly `<public-origin>/api/auth/callback` in Supabase + Google OAuth settings.

### Auth checks
- Sign in via Google.
- Confirm redirect lands on `/dashboard` or safe requested redirect.
- Confirm a user profile row is created automatically on first login.
- Visit `/api/gbp/status` while signed in and verify `authenticated: true`.

### GBP durability checks
- Open `/gbp-health`.
- If runtime Google creds are configured, verify connection guidance does not mention missing refresh durability prerequisites.
- After reconnect/sync, verify health score and recent events update.

### Billing checks
- Confirm all monthly + annual Stripe price IDs are populated.
- Open pricing/billing UI and verify no missing-plan/runtime errors.
- If webhook verification is part of the pass, confirm `STRIPE_WEBHOOK_SECRET` exists before testing.

### Cron/automation checks
- Verify `CRON_SECRET` is present and long enough.
- Confirm protected cron endpoints are tested only with the bearer secret.
- Verify `UPSTASH_QSTASH_URL`, `UPSTASH_QSTASH_TOKEN`, and `GEOTHORITY_REPUTATION_JOB_SECRET` are present before testing delayed reputation sends or retry behavior.
- Verify `GEOTHORITY_REPUTATION_WEBHOOK_SECRET` exists before enabling external event ingestion.

### Reputation engine checks
- Open `/reputation` and confirm the transport card matches the intended mode: simulated for demo/safe mode, Twilio for live mode.
- In live mode, confirm the authenticated diagnostics no longer report missing sender/base URL/callback prerequisites.
- Send one test request end-to-end and verify status callback updates the delivery state instead of leaving the request stuck in `sending`.
- Reply with `STOP` from a test number and confirm opt-out is logged before any further sends are attempted.

## 5) Safe diagnostics rules

- Do **not** print secret values into screenshots, reports, or chat.
- Prefer the readiness script output over hand-checking env files on-screen.
- If live proof fails, capture the exact route, status code, and sanitized error text.
- If auth fails, check redirect URL alignment before touching code.

## 6) Fastest recovery path by failure type

- **`/api/health` degraded** → missing env or Supabase connectivity first.
- **Google sign-in loops/fails** → callback URL mismatch first.
- **GBP connected but flaky** → runtime Google client pair + reconnect flow.
- **Billing UI/runtime errors** → missing Stripe publishable key or price IDs.
- **Cron 401s** → wrong/missing `CRON_SECRET` bearer value.

## Staging repair verification — 2026-09-25

- App: https://geothority-e2e-staging-access.up.railway.app
- Railway environment/service: `Access` / `geothority-e2e-staging`.
- Supabase branch: `geothority-e2e-staging` (`dmuxqebcktqnmgprlymm`).
- Repair branch: `codex/geothority-e2e-repair`.
- `npm run typecheck` and the production build pass with TypeScript checking enforced.
- Security, cron, and runtime regression suites pass, including failed scans, profile persistence, tenant-scoped templates, publishing failures, and billing writes.
- Browser: login, signup form, password recovery, and sign-in navigation render; protected routes redirect to login.
- The deployed process passes `/api/healthz`. `/api/health` returns 503 while the staging service-role key is blank.
- Existing AI provider variables from the same Access environment are referenced privately by the staging service; provider calls still require an authenticated proof pass.
- Rollback-only staging SQL verifies profile bootstrap, canonical business upsert, onboarding completion, repeat-save behavior, and tenant isolation. Fixture counts returned to zero.
- No production deployment or production data changes were made.

### Remaining configuration and proof

1. Configure a server key belonging to **dmuxqebcktqnmgprlymm** as `SUPABASE_SERVICE_ROLE_KEY` on the isolated staging service. Never reuse the production project's key.
2. Confirm Supabase Auth allows the staging origin and `/api/auth/callback`, then use a disposable staging account.
3. Verify saved business details survive reload, onboarding completion reaches the dashboard, a real public website scan is persisted, and Action Center reads that scan.
4. Verify AI calls using the existing Access provider references. Maps/Foursquare, billing, and delivery integrations require their respective staging credentials before testing their live actions.
5. Complete the customer journey before promoting any repair to production.
