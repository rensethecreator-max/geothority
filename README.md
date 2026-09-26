# Geothority

**Dominate Local Search & AI for Insurance Agents**

Geothority helps independent insurance agents discover why they're invisible in search and AI, then generates and auto-publishes the trust signals, content, and optimizations that make them the default local answer.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the database migration
#    Go to: https://supabase.com/dashboard/project/ofhapyienurfdndpclor/sql/new
#    Paste the contents of supabase/migration.sql and click Run

# 3. Configure Google OAuth in Supabase
#    Dashboard → Authentication → Providers → Google
#    Add your Google OAuth Client ID and Secret
#    Set redirect URL to: http://localhost:3010/api/auth/callback

#    Optional but recommended for server-side GBP refresh/publishing:
#    also set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local

# 4. Preflight proof-pass readiness (safe, no secrets printed)
npm run proof:readiness

# 5. Start development server
npm run dev
# → http://localhost:3010
```

## Deployment (Railway-first)

Geothority should be treated as a standard long-running Next.js service.

- **Build command:** `npm run build`
- **Start command:** `npm run start`
- **Port:** Railway injects `PORT`; do not hardcode it.
- **Canonical URL envs:** set both `NEXT_PUBLIC_APP_URL` and `APP_URL` to the live domain.
- **Deployment smoke test:** `npm run ops:deployment-truth`
- **Cron smoke test:** `npm run ops:cron:smoke`

### Scheduled automation

Run scheduled automation from a separate Railway service. Set its start command to `node scripts/cron-dispatch.mjs`, its Cron Schedule to `*/15 * * * *`, and set `APP_URL=https://geothority.io`. Set `CRON_SECRET` as a Railway reference to the Geothority web service's `CRON_SECRET` (for example `${{Geothority.CRON_SECRET}}`). The dispatcher calls the jobs below at their UTC times and exits after each run. Do not attach the cron schedule to the web service.

The Vercel Hobby plan rejects the 15-minute journey schedule. Vercel cron entries are therefore disabled; use the Railway worker for all scheduled jobs. Send `Authorization: Bearer $CRON_SECRET`.

| Schedule (UTC) | Method | Path |
|---|---|---|
| every 15 minutes | `GET` | `/api/cron/journeys` |
| Mondays 09:00 | `GET` | `/api/cron/auto-scan` |
| Mondays 06:00 | `GET` | `/api/cron/gbp-monitor` |
| daily 07:00 | `GET` | `/api/cron/competitor-monitoring` |
| Mondays 03:00 | `POST` | `/api/cron/expansion-refresh` |
| custom | `POST` | `/api/cron/ai-visibility` |
| custom | `GET` | `/api/cron/citation-drift` |

The Railway dispatcher runs the first five jobs on this table. AI visibility and citation drift remain custom jobs and can be called by another scheduler when configured.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth)
- **AI:** OpenAI GPT-4o-mini (content generation, Will chatbot, analysis)
- **Payments:** Stripe (3-tier subscription billing)
- **Email:** Resend
- **PWA:** next-pwa (service worker, offline support)

## Architecture

```
src/
├── app/
│   ├── (public)/          # Landing, login, pricing, legal pages
│   ├── (app)/             # Authenticated dashboard pages
│   ├── api/               # API routes (scan, chat, content, stripe)
│   └── layout.tsx         # Root layout with PWA meta tags
├── components/
│   ├── chat/              # Will AI chatbot
│   ├── layout/            # Sidebar, header
│   ├── scan/              # Trust Stack visualization, Quick Win cards
│   ├── shared/            # Error boundary, empty states, skeletons
│   └── ui/                # shadcn/ui components
└── lib/
    ├── openai.ts          # OpenAI client + Will system prompt
    ├── scanner.ts         # Website scanning engine
    ├── stripe.ts          # Stripe client + plan config
    ├── supabase/          # Client/server/middleware Supabase
    └── types.ts           # TypeScript types
```

## Stripe Products / Env Mapping

Created via `scripts/setup-stripe.ts`:

| Plan | Price | Stripe Price ID |
|------|-------|-----------------|
| Starter | $97/mo or $970/yr | `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` / `NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID` |
| Growth | $197/mo or $1970/yr | `NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID` / `NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID` |
| Authority | $297/mo or $2970/yr | `NEXT_PUBLIC_STRIPE_AUTHORITY_PRICE_ID` / `NEXT_PUBLIC_STRIPE_AUTHORITY_ANNUAL_PRICE_ID` |
| Agency | $997/mo or $9970/yr | `NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID` / `NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID` |

## Mobile Distribution

See `mobile/README.md` for full build instructions.

- **Google Play:** TWA via Bubblewrap (`mobile/bubblewrap-config.json`)
- **iOS App Store:** Capacitor wrapper (`mobile/capacitor.config.ts`)
- **Web:** PWA with manifest + service worker (auto-generated)

## Key Features

1. **90-Second Website Scanner** — Fetches & analyzes any URL across 5 trust layers
2. **Local Trust Stack™** — Proprietary 5-layer scoring visualization
3. **Quick Win Cards** — Copy-pasteable fixes with highest impact first
4. **AI Content Generator** — SEO-optimized city/service landing pages
5. **Competitor Watchdog** — Track competitor moves, "Match This" to counter
6. **CMS Auto-Publish** — WordPress REST API integration
7. **Will AI Chatbot** — Scoped assistant in bottom-right corner
8. **Stripe Billing** — Checkout, webhooks, plan management

## Proof-Pass Readiness

- `npm run proof:readiness` — audits env coverage, auth callback expectations, cron/billing prerequisites, and optional live endpoints.
- `npm run build:proof` — fast compile gate before operator verification.
- `PROOF_PASS_RUNBOOK.md` — manual operator checklist for local + live proof passes.

## Environment Variables

See `.env.local` for all required variables. Key ones:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_*_PRICE_ID` and `NEXT_PUBLIC_STRIPE_*_ANNUAL_PRICE_ID` for each paid plan
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` and `APP_URL`
- `CRON_SECRET`
