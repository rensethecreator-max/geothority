# Geothority QA Blueprint

Last updated: 2026-06-02
Owner: Ralis / Bud
Purpose: durable E2E + smoke checklist for Geothority. Keep returning to this blueprint until every critical lane is green or a concrete fix/workaround is recorded.

## Pass / Fail Rule

Geothority is only "green" when:

- local build passes
- readiness audit passes
- cron smoke passes
- deployment truth passes
- local E2E passes
- live E2E passes or any live-only blocker is explicitly identified
- browser QA confirms critical public and authenticated flows are readable and functional

## Test Lanes

### Lane 1. Config / Readiness

Run:

```bash
npm run proof:readiness
npm run proof:readiness -- --base-url=https://geothority.io
```

Green means:

- critical env coverage is present
- live `/api/health` responds correctly
- live `/api/gbp/status` responds correctly
- auth callback expectations are correct

### Lane 2. Build Gate

Run:

```bash
npm run build:proof
```

Green means:

- production build completes cleanly

### Lane 3. Cron / Automation Smoke

Run:

```bash
npm run ops:cron:smoke
```

Green means:

- protected cron endpoints respond as expected
- automation surface is not obviously broken

### Lane 4. Deployment Truth

Run:

```bash
npm run ops:deployment-truth
```

Green means:

- `geothority.io` resolves and serves expected responses
- `www.geothority.io` resolves and serves expected responses

### Lane 5. Local E2E

Run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npm run e2e:new-user
```

Critical assertions:

- login works
- onboarding completes
- first scan path completes
- scan result page renders
- action-center entry is reachable

### Lane 6. Live E2E

Run:

```bash
PLAYWRIGHT_BASE_URL=https://geothority.io npm run e2e:new-user
```

Critical assertions:

- signup/login works against live auth
- onboarding works
- first scan path works
- scan detail page loads

### Lane 7. Public Browser QA

Check manually in browser:

- landing hero
- Trust Stack / Signature Framework
- pricing preview section
- final CTA section
- `/pricing`
- `/service-facts`
- `/faq`
- footer links

Green means:

- text is readable
- CTA buttons are readable
- no obviously broken sections
- expected nav paths work

### Lane 8. Authenticated Browser QA

Check manually in browser:

- `/login`
- `/onboarding`
- `/dashboard`
- `/scan`
- `/scan/[id]`
- `/action-center`
- `/billing`
- `/reputation`
- `/gbp-health`
- `/competitors`
- `/content`

Green means:

- core screens load
- no blocking runtime crashes
- primary actions are available

## Required Evidence

For each lane, capture:

- command or browser path used
- result
- any blocker
- fix commit if code changed
- re-test result

## Fix Loop

When a lane fails:

1. identify exact failing route / command / selector
2. patch surgically
3. rebuild
4. redeploy if live-facing
5. rerun the failed lane
6. rerun adjacent lanes if the fix touched shared code

