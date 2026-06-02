# Geothority Launch Blueprint

Last verified: 2026-06-02
Owner: Ralis / Bud
Deploy target: Railway project `Geothority`, environment `production`, service `Geothority`
Primary domain: `https://geothority.io`

## Current truth

- Git repo status: clean on `main`
- GitHub alignment: local `main` == `origin/main` at `a04fda03798962b512043bd2c8f172ec5a515eee`
- Local production build: passes with `npm run build:proof`
- Local E2E smoke: passes with `npm run e2e:new-user`
- Railway auth: working with account-level `RAILWAY_API_TOKEN`
- Railway service status before redeploy: latest successful deployment was `06e54001-9c2e-4aff-935e-f2940c565ff0`
- Public production status before redeploy: failing
  - `https://geothority.io` timed out and then returned Railway edge fallback `502`
  - `https://www.geothority.io` timed out and then returned Railway edge fallback `502`
  - Railway public hostname `https://5aurld9p.up.railway.app` returned Railway edge fallback `404`
- Production logs show repeated Next.js runtime errors:
  - `Failed to find Server Action "...". This request might be from an older or newer deployment.`

## What this means

The codebase itself is not the current blocker. The launch blocker is the live Railway runtime and/or domain routing layer. Local build and local E2E are healthy enough to prove the current commit is viable. Public production is not launch-ready until the Railway deploy and domain path are healthy again.

## Launch gate

Geothority is launch-ready only when all of the following are true:

1. `railway status` resolves to Geothority production service.
2. `railway service status` shows the active deployment as `SUCCESS`.
3. `npm run ops:deployment-truth` succeeds against `geothority.io` and `www.geothority.io`.
4. `npm run proof:readiness -- --base-url=https://geothority.io` passes the live HTTP checks for `/api/health` and `/api/gbp/status`.
5. `npm run build:proof` passes locally.
6. `npm run e2e:new-user` passes locally.
7. Manual live operator pass confirms:
   - home page loads
   - login works
   - onboarding works
   - dashboard loads
   - first scan path works
   - billing and cron secrets are present

## Standard verification sequence

### 1. Repo truth

```bash
git status -sb
git rev-parse HEAD
git rev-parse origin/main
```

Expected:
- clean working tree
- local `HEAD` matches `origin/main`

### 2. Local build gate

```bash
npm run build:proof
```

### 3. Local E2E proof

Start local prod server:

```bash
PORT=3010 npm run start
```

Then run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npm run e2e:new-user
```

Expected:
- test passes through sign-in, onboarding, first scan, and action-center entry

### 4. Railway deployment truth

```bash
railway status
railway service status
npm run ops:deployment-truth
```

### 5. Live readiness truth

```bash
npm run proof:readiness -- --base-url=https://geothority.io
```

## Parallel fix lanes

### Lane A — Railway runtime recovery
Owner: deploy/operator

- Confirm the active deployment finishes building and reaches `SUCCESS`
- Re-test `geothority.io`, `www.geothority.io`, and the Railway public hostname
- Inspect Railway deploy and HTTP logs for 5xx responses
- If server-action mismatch persists, trigger a clean redeploy of the same clean commit
- Confirm custom domains are still attached to the intended service

Definition of done:
- public home page and `/api/health` return successfully without Railway fallback headers

### Lane B — Next.js server action drift
Owner: frontend/runtime

- Investigate pages/forms using server actions that can break after partial deploy or stale client cache
- Identify whether middleware, CDN caching, or multiple live deployment instances are serving mismatched action IDs
- Add a recovery note or version guard if this is a recurring deploy mode

Definition of done:
- no repeated `Failed to find Server Action` errors in Railway logs after redeploy and fresh browser session

### Lane C — Live health endpoint performance
Owner: backend/runtime

- Confirm `/api/health` and `/api/gbp/status` answer within timeout budget in production
- Check for slow upstream calls, blocking diagnostics, or auth/session waits
- Keep the health endpoints lightweight enough for smoke checks

Definition of done:
- readiness script passes both live HTTP checks

### Lane D — Schema/test cleanup durability
Owner: database/test harness

- Resolve missing-table cleanup warnings seen during local E2E:
  - `operator_run_events`
  - `operator_runs`
  - `fix_execution_plans`
  - `reputation_requests`
  - `reputation_feedback_items`
  - `reputation_proof_assets`
  - `reputation_templates`
  - `reputation_settings`
  - `business_profiles`
- Decide whether the warnings mean optional migrations are absent in the current environment or whether cleanup should skip more gracefully

Definition of done:
- E2E cleanup runs without schema-cache warnings

## Production-ready requirements

- Railway account token stored as the single Railway auth source
- Geothority service linked to project `Geothority` and environment `production`
- Custom domains attached and routing to the correct service
- `NEXT_PUBLIC_APP_URL` and `APP_URL` both set to `https://geothority.io`
- Supabase auth callback matches `https://geothority.io/api/auth/callback`
- Stripe, Resend, Google runtime OAuth, cron, and reputation queue/webhook secrets present
- Health and GBP status endpoints reachable from the public domain
- One-click redeploy path documented and working
- Proof pass rerunnable without rediscovering the environment

## Release decision rule

Do not announce launch-ready until the public Railway domain path is healthy. A passing local build plus local E2E is necessary but not sufficient.
