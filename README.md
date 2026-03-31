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

# 4. Start development server
npm run dev
# → http://localhost:3010
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
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

## Stripe Products (Live)

Created via `scripts/setup-stripe.ts`:

| Plan | Price | Stripe Price ID |
|------|-------|-----------------|
| Audit Only | $47/mo | `price_1TGol1JRm4sicjxqtiVT7oii` |
| Starter | $149/mo | `price_1TGol1JRm4sicjxqCopNUSTP` |
| Pro | $299/mo | `price_1TGol2JRm4sicjxqeQMHmTfc` |

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

## Environment Variables

See `.env.local` for all required variables. Key ones:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_AUDIT` / `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`
- `RESEND_API_KEY`
# Geothority — Redeploying with all env vars
