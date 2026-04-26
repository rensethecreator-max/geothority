# Geothority proof-pass runbook

Use this when Railway access is unavailable and you need to shorten the final post-deploy proof pass.

## 1) Preflight config audit

```bash
npm run proof:readiness
```

What it checks safely:
- critical env coverage (Supabase, OpenAI, Maps, Foursquare)
- recommended proof-pass env coverage (Stripe, Resend, Google runtime OAuth, cron secret)
- app URL / auth callback expectations
- optional live HTTP checks when a base URL is provided

Useful variants:

```bash
npm run proof:readiness -- --env=.env.example --skip-http
npm run proof:readiness -- --base-url=http://localhost:3010
npm run proof:readiness -- --base-url=https://geothority.io
npm run proof:readiness -- --json > tmp/geothority-proof-readiness.json
```

## 2) Build gate

```bash
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
- `/api/health` responds successfully
- `/api/gbp/status` responds successfully for an anonymous session
- output shows the expected `/api/auth/callback` URL

## 4) Operator proof checklist for Vercel/live pass

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
