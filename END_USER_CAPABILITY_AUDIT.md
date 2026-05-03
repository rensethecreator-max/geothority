# Geothority End-User Capability Audit

**Generated:** 2026-04-17  
**Scope:** Full application code audit — every route, component, API, and feature from the end-user perspective.  
**App Root:** `/home/bud/.openclaw/workspace/apps/geothority`

---

## 1. Public Website (Unauthenticated)

### Landing Page (`/`)
- Hero section with value prop and CTA to start free scan
- "How it Works" section explaining the 90-second scan
- Trust Stack™ 5-layer framework explainer (Foundation, Trust Pages, Geo Content, Reviews, AI Optimization)
- Feature cards (AI-Ready Scan, Audit & Fix, Content Engine, Quick Wins, Trust Stack, Competitor Watchdog)
- Social proof / testimonials
- CTA to sign up or run a scan

### Pricing Page (`/pricing`)
- 4 paid tiers displayed: Starter ($97/mo), Growth ($197/mo), Authority ($297/mo), Agency ($997/mo)
- Annual pricing available with savings
- Feature comparison matrix across plans
- Free tier listed with 3 daily scans
- Expandable FAQ per plan
- CTA buttons → Stripe checkout

### Bundle Page (`/bundle`)
- Reputation Engine is now positioned as a native Geothority capability rather than a separate Starcepta bundle surface
- Bundle features listed for each product
- Save $96/mo messaging
- CTA to bundle purchase

### Comparison Pages (`/compare/[slug]`)
- Pre-built competitor comparisons: BrightLocal, Moz Local, Yext, Whitespark, etc.
- Feature-by-feature comparison table (Geothority vs. competitor)
- Differentiators section
- FAQ per comparison
- SEO-optimized with schema markup

### Industry Pages (`/for/[slug]`)
- Industry-specific landing pages (insurance-agents, etc.)
- Pain points and solutions
- Testimonial and stats
- FAQ section
- CTA to scan/signup

### Location Pages (`/locations/[city]`)
- City-specific landing pages (Chicago, etc.)
- Neighborhood breakdowns
- Industries served
- Testimonial and stats
- FAQ section
- CTA to scan/signup

### FAQ Page (`/faq`)
- Comprehensive FAQ with Schema.org FAQPage markup
- Topics: Trust Stack, AI Overview, citations, GBP, pricing, comparisons
- SEO-optimized metadata and OG tags

### Insurance Agents Page (`/insurance-agents`)
- Dedicated vertical landing page for insurance agents
- 6 pain-point/solution pairs
- CTA to scan

### Static Legal Pages
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy

---

## 2. Authentication & Account Management

### Login / Sign Up (`/login`)
- Dual-mode form: sign-in and sign-up (toggled via `?mode=signup`)
- Email + password authentication via Supabase
- Google OAuth sign-in (with redirect support)
- Show/hide password toggle
- Error display and redirect parameter support (`?redirect=/path`)
- `/signup` → auto-redirects to `/login?mode=signup`

### Password Reset
- `/forgot-password` — Enter email, sends Supabase reset link
- `/reset-password` — Set new password (min 8 chars, must confirm)

### Auth Callback (`/api/auth/callback`)
- Handles Supabase OAuth code exchange
- Redirects to original protected path after auth
- Open-redirect protection (only relative paths allowed)

### Middleware-Enforced Auth
- Protected paths: `/dashboard`, `/scan`, `/content`, `/competitors`, `/settings`, `/billing`, `/onboarding`, `/admin`, `/google-business`, `/analytics`, `/gbp-monitor`, `/schema-generator`, `/ai-overview`
- Unauthenticated users → redirected to `/login?redirect=<path>`
- Logged-in users visiting `/login` or `/signup` → redirected to `/dashboard`
- Admin paths restricted to emails in `ADMIN_EMAILS` env var

### Account Deletion
- Settings page → "Delete Account" button
- Requires email confirmation to proceed
- Calls `DELETE /api/user/account` — deletes from `auth.users` (cascading FK deletes)
- Real and fully wired

---

## 3. Onboarding (`/onboarding`)

### Onboarding Wizard (`OnboardingWizard` component)
- Multi-step guided flow for new users
- Collects: business name, website URL, city, state
- Trust Stack visualization introduction
- Step completion tracked in localStorage (`geothority_onboarding_completed_steps`)
- Middleware auto-redirects new users (where `onboarding_completed = false`) to `/onboarding`
- On completion, sets `user_profiles.onboarding_completed = true`

### Welcome Flow (`WelcomeFlow` component)
- Shown on dashboard for users without scans
- Quick-start prompts to run first scan

---

## 4. Scan Workflow

### New Scan (`/scan`)
- Form: URL, business name, city, state
- Calls `POST /api/scan` → `scanWebsite()`
- Real website scraping via Cheerio (fetches HTML, parses DOM)
- SSRF protection (blocks internal/metadata URLs)
- Rate limited (`scanRatelimit`)
- Stores result in Supabase `scans` table

### What the Scanner Detects
**Layer 1 — Foundation:**
- SSL validity and issuer
- Page load time
- robots.txt presence
- sitemap.xml presence
- H1 tag presence and text
- viewport meta tag
- Open Graph tags (title, description, image)
- Twitter Card tag
- NAP consistency (name, address, phone on page)
- GBP link presence

**Layer 2 — Trust Pages:**
- About page detection
- FAQ page detection
- Licensing/credentials mentions
- Service area pages

**Layer 3 — Geo Content:**
- City-specific pages detection
- Internal links scanned
- Page count

**Layer 4 — Reviews:**
- Google Reviews link detection
- Reviews mentioned on page

**Layer 5 — AI Optimization:**
- Schema markup detection (general, FAQ, LocalBusiness)
- Entity signals

### Scan Result Page (`/scan/[id]`)
- **Trust Stack Visualization** — 5-layer donut chart with per-layer scores
- **Score Ring** — Overall 0–100 score display
- **Quick Win Cards** — Actionable fixes with copy-paste code, impact level (high/medium/low)
- **Competitor Gaps** — Shows competing domains and their advantages
- **Fix Package** ("Fix Everything" button) — Calls `POST /api/scan/fix-all` → LLM generates:
  - Schema markup (JSON-LD)
  - FAQ content
  - About page content
  - Landing page content
  - Meta tags
  - Listing sync instructions
  - AI optimization recommendations
  - Each fix has impact rating, instructions, and copy button
  - Some fixes auto-applied flag
- **PDF Report Export** — Client-side HTML-to-PDF generation with styled report (Trust Stack breakdown, quick wins, competitor gaps, recommendations)
- **Reputation Engine CTA** — Shown on scan results when review health is weak, routes users into the native review workflow

### Scan History
- `GET /api/scan` returns last 20 scans for the user
- Dashboard shows recent scans list
- Reports page shows full history with trend arrows

---

## 5. Dashboard (`/dashboard`)

### Main Dashboard Features
- **Welcome Flow** for new users (no scans yet)
- **Latest Scan Summary** — Score ring + Trust Stack visualization
- **Quick Win Highlights** — Top fixes from latest scan
- **Score History Chart** — Line chart (Recharts) showing Trust Stack score over time; toggle per-layer lines
- **Health Pulse** widget — Recent activity/status feed
- **Recent Scans List** — Links to scan detail pages
- **Reputation Engine Banner** (dismissible when used)
- **CTA to run new scan** when no scans exist
- All data fetched from Supabase

---

## 6. Reports (`/reports`)

- Table of all past scans with: business name, city, score badge, score trend (up/down/flat), scan date
- Per-layer score breakdown columns
- Click-through to full scan detail (`/scan/[id]`)
- PDF export per scan (via `PDFReportButton`)
- Empty state when no scans

---

## 7. Analytics (`/analytics`)

### User Analytics
- **Scan Activity Chart** — Line chart of scans over time (7/30/90 day buckets)
- **Content Generation Chart** — Bar chart of content items generated over time
- **Stats cards** — Total scans, total content, citation checks
- Data sourced from Supabase `scans` and `generated_content` tables

### Admin Analytics (`/admin/analytics`)
- **Platform Analytics Dashboard** — DAU, signups, revenue
- **Conversion Funnel Chart** — Funnel visualization (signup → first scan → paid, etc.)
- Date range selector (7/30/90 days)
- Admin-only (email match required)

---

## 8. Content Generation

### Content Library (`/content`)
- Lists all generated content (landing pages, trust pages, FAQs, about pages)
- Status badges (draft / published)
- **Publish button** — Calls `POST /api/publish` which publishes to connected CMS (WordPress)
- **Delete** generated content
- Empty state with link to generate content
- Data from Supabase `generated_content` table

### Generate Content (`/content/generate`)
- Form: city, service (dropdown of 12 insurance service types), business name, agent name
- Calls `POST /api/content/generate` → LLM generates SEO-optimized landing page
- **Streaming response** — Tokens streamed to UI in real-time
- Progress indicator during generation
- **Live HTML Preview** — DOMPurify-sanitized rendered preview
- **Markdown output** also available
- Quality score assigned to generated content
- **Plan gated**: Requires Authority plan or above
- Supports `?scanId=` and `?city=` URL params for scan-to-content flow
- Abort generation support

### Publish to CMS
- `POST /api/publish` — Publishes generated content to WordPress (via stored CMS credentials)
- Updates `generated_content` status to "published" and records `cms_post_id`
- CMS credentials stored in `user_profiles.cms_credentials`

---

## 9. Competitor Watchdog (`/competitors`)

### Competitor Dashboard
- **Comparison Cards** (`ComparisonCards` component) — Side-by-side comparison of user vs competitors
- **Competitor List** with domain, score, city, last checked
- **Alerts Feed** — Per-competitor alerts: new page detected, review burst, rank change, schema added
- Severity badges (info / warning / critical)
- Click-through to details

### API
- `GET /api/competitors` — Search competitors via Google Places API
- `POST /api/competitors` — Same, with body params
- **⚠️ Currently uses MOCK data** in the UI — `MOCK_COMPETITORS` array is hardcoded
- Real API route exists and calls Google Places API, but the page component renders mock data

---

## 10. GBP (Google Business Profile)

### GBP Monitor (`/gbp-monitor`)
- **List of monitored businesses** — fetched from `gbp_monitors` table
- **Create new monitor** — Form: business name, city, state, place ID
- Calls `POST /api/gbp/monitor` → stores in Supabase
- **Alerts display** — Shows unread GBP alerts from `gbp_alerts` table
- **Delete monitor** support
- **Cron job** — `GET /api/cron/gbp-monitor` scans all active monitors weekly
- Scan frequency setting per monitor

### Google Business Page (`/google-business`)
- **Google OAuth connection** — `signInWithGoogleBusiness()` via Supabase OAuth with `business.manage` scope
- **GBP Dashboard** component (`GBPDashboard`) showing:
  - Profile data (name, address, phone, categories, hours)
  - Reviews summary
  - Posts
  - Q&A
  - **Audit result** with recommendations
- **Sync GBP data** — `POST /api/gbp/sync` → pulls live GBP data; requires Starter plan
- **Status check** — `GET /api/gbp/status` — checks Google connection status
- **Profile fetch** — `GET /api/gbp/profile` — returns stored GBP profile

### GBP API Search
- `GET /api/gbp?name=...&location=...` — Search Google Places API for business listing
- Returns: name, address, phone, rating, review count, categories, hours, photos

---

## 11. Citation Checker (`/citations`)

### Citation Audit
- Form: business name, address, phone, city, state
- Calls `POST /api/citations` → Scrapes directories for NAP consistency
- **Directory coverage**: Google Business Profile, Yelp, BBB, Bing Places, Apple Maps, and more
- Per-directory result card showing:
  - Found/not found status
  - Name match, address match, phone match
  - Consistency score (0–100)
  - **"Fix This" link** — claim URL for each directory
  - **Fix steps** — step-by-step instructions to claim/fix listing
- **Summary**: total directories, found count, overall consistency grade
- **Recommendations** list

### Citation Sync (`/api/citations/sync`)
- `POST /api/citations/sync` — Syncs business listing to Foursquare network (~50 directories)
- Uses Foursquare Places API (V2 with Client ID/Secret)
- Rate limited: 1 sync per user per day
- **Plan gated**: Requires Growth plan or above
- Foursquare feeds: Bing, Samsung, Uber, HERE, TomTom, etc.

---

## 12. AI Overview Checker (`/ai-overview`)

### AI Search Visibility Audit
- Form: business name, business type, city
- Checks visibility across 5 AI engines:
  1. **Google AI Overview** — Uses `getCachedAIOverview` with 24h cache
  2. **ChatGPT** — Via OpenAI API (real call)
  3. **Perplexity AI** — Via Perplexity API (real call)
  4. **Claude** — Via OpenRouter or Anthropic API
  5. **Gemini** — Via Google AI API
- Per-engine result: found/not found, snippet, confidence level, competitors mentioned
- **Overall visibility score**: high / medium / low / none
- **Top recommendations** for improving AI visibility
- **Plan gated**: Requires Growth plan or above
- **Caching**: Results cached 24h in `ai_cache` Supabase table

---

## 13. Schema Generator (`/schema-generator`)

### Multi-Step Wizard
1. **Select schema type** — 9 types: LocalBusiness, InsuranceAgency, ProfessionalService, MedicalBusiness, RealEstateAgent, AutoDealer, Restaurant, FAQPage, Service
2. **Fill business details** — name, URL, phone, email, address, city, state, zip, description, hours, price range
3. **FAQ items** (for FAQPage type) — add question/answer pairs
4. **Generated JSON-LD output** — Copy to clipboard button
- **Info tooltips** for each field
- Fully client-side generation (no API call)
- No plan gating (free for all authenticated users)

---

## 14. Settings

### Main Settings (`/settings`)
- **Profile Edit** — Business name, city, state, website URL (saves to `user_profiles`)
- **CMS Integration** — Connect WordPress: site URL, username, application password
- **Plan Display** — Shows current plan with upgrade CTA
- **Account Deletion** — Requires email confirmation, fully wired
- Success/error messaging

### Embed / Plugin Settings (`/settings/embed`)
- **Embed API Key** — Auto-generated, can regenerate
- **Installation Snippet** — Copy-paste `<script>` tag for website embed
- **Platform-specific instructions**:
  - WordPress (WPCode plugin method, 5 steps)
  - Squarespace (Code Injection method, 4 steps)
  - Wix (Custom Code method, 4 steps)
  - Custom HTML (direct paste, 3 steps)
- **Installation verification** — Checks `embed_installed`, `embed_domain`, `embed_last_seen`
- **Visual platform mockups** (illustrated guides)

### Notification Settings (`/settings/notifications`)
- **Push notification toggle** — Enable/disable
- **Category toggles**: Product Updates, Journey, Alerts, Digest
- **Quiet hours** — Start/end time configuration
- **Max per day** — Frequency limit slider
- **Timezone** setting
- **Subscribe/Unsubscribe** push via Service Worker + PushManager
- Data persisted to `user_push_preferences` table via `PUT /api/push/preferences`

---

## 15. Billing & Subscription

### Billing Page (`/billing`)
- **Current plan display** with badge and name
- **Plan upgrade CTA** → Stripe checkout
- **Stripe Billing Portal** — Opens Stripe customer portal for payment method management
- Plan labels: Free, Audit Only, Starter, Growth, Authority, Agency

### Stripe Checkout (`/api/stripe/checkout`)
- Creates Stripe Checkout Session
- Supports monthly and annual pricing
- Metadata includes Supabase user ID and plan name

### Stripe Webhook (`/api/stripe/webhook`)
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Updates `user_profiles.plan` and `stripe_customer_id`
- Signature verification with `STRIPE_WEBHOOK_SECRET`

### Billing Success (`/billing/success`)
- Post-checkout success screen
- 5-second auto-redirect to dashboard

---

## 16. Notifications

### In-App Notifications
- `GET /api/notifications` — List user notifications (paginated, filterable by unread)
- `PATCH /api/notifications/[id]/read` — Mark single notification as read
- `PATCH /api/notifications/read-all` — Mark all as read
- `NotificationCenter` component in sidebar

### Push Notifications
- **Web Push** via Service Worker (`sw.js`, Workbox)
- Subscribe/unsubscribe via `POST /api/push/subscribe`
- Stores endpoint + keys in `push_subscriptions` table
- **Push journeys** — Automated onboarding push sequence
- Admin can send push to individual users or segments

### Email Journeys
- **Onboarding email journey** — Automated drip sequence:
  1. Welcome email (immediate)
  2. "Run First Audit" (Day 1)
  3. "Connect GBP" (Day 3)
  4. "Content Tip" (Day 7)
  5. "Competitor Alert Setup" (Day 14)
- Processed by cron: `GET /api/cron/journeys` (every 15 min)
- Sends via Resend API
- Admin can pause/resume individual user journeys

---

## 17. Admin Panel

### Admin Analytics (`/admin/analytics`)
- DAU, signups, revenue charts
- Conversion funnel visualization
- Date range selector (7/30/90 days)
- Data from `analytics_events` table and `analytics_dau` RPC

### Admin Diagnostics (`/admin/diagnostics`)
- **System health scan** — Checks env vars, DB tables, API connectivity
- **Issue list** — `diagnostic_issues` table with severity and status
- **Repair actions** — `repair_actions` table; admin can trigger auto-repair
- Real-time status updates (detected → analyzing → repairing → resolved/failed)

### Admin Email Journey (`/admin/email-journey`)
- Journey step configuration viewer
- Per-user progress list (journey, status, step, last activity)
- Pause/resume individual user journeys
- Filter by journey ID and status

### Admin Push Notifications (`/admin/push`)
- **Send push** — To individual user or segment (all, free, paid, churned, etc.)
- Title, body, link, icon configuration
- **Push stats** — Sent/delivered/failed counts, chart over time
- **Test push** — Send test to self

---

## 18. Plugin / Embed System

### Embed Widget (`public/embed.js`)
- JavaScript snippet users paste into their website
- Renders a Geothority trust widget showing Trust Stack score
- Communicates with `/api/plugin/data` to fetch latest scan data via API key
- **Installation reporting** — `/api/plugin/report` updates `embed_installed`, `embed_domain`, `embed_last_seen`

### Plugin Data API (`/api/plugin/data`)
- `GET /api/plugin/data?key=<embed_api_key>`
- Returns latest scan data, Trust Stack score, quick wins
- Authenticated via embed API key (no user session required)
- Service role Supabase lookup

---

## 19. PWA Support

### Service Worker
- `public/sw.js` — Workbox service worker for offline caching
- `public/workbox-4754cb34.js` — Workbox runtime
- `public/manifest.json` — Web app manifest (name, icons, theme color, start_url)
- Icons: `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`
- Installable as PWA on mobile/desktop

---

## 20. Automated Cron Jobs

### Weekly Auto-Scan (`/api/cron/auto-scan`)
- Scans all active monitors weekly
- Compares Trust Stack score changes
- Sends email via Resend when score improves or declines
- Shows quick wins in the email

### Weekly GBP Monitor (`/api/cron/gbp-monitor`)
- Scans all active GBP monitors
- Secured with `CRON_SECRET` bearer token

### Journey Processing (`/api/cron/journeys`)
- Runs every 15 minutes
- Processes pending email journey steps and push journey steps

---

## 21. AI Chat / Will Assistant

### Chat API (`/api/chat`)
- AI chat assistant ("Will") for local SEO questions
- System prompt: Geothority-specific guidance
- Prompt injection protection (regex-based pattern blocking)
- Rate limited
- Max 20 messages per conversation, 1000 chars per message
- Uses OpenAI or OpenRouter API

### Support Conversations (`/api/support/conversations`)
- Create support conversations
- AI-powered replies via OpenRouter/OpenAI
- Stored in `support_conversations` table

---

## 22. Rate Limiting

- Scan endpoint rate limited (`scanRatelimit`)
- Chat rate limited (`chatRatelimit`)
- Citation sync: 1 per user per day
- General API auth checks on all protected routes

---

## 23. SEO & Performance

### Server-Side SEO
- Next.js Metadata API used on all public pages
- OpenGraph and Twitter card metadata
- Schema.org FAQPage markup on FAQ and comparison pages
- Canonical URLs set
- SSR for public marketing pages

### Analytics Tracking
- `trackEvent()` client-side analytics helper
- `POST /api/analytics/event` — Stores events in `analytics_events` table
- Supports anonymous and authenticated events

---

## 24. Plan Gating System

### Tier Hierarchy
`free < audit < starter < growth < authority < agency`  
(`pro` treated as legacy, equivalent to `starter`)

### Feature Access by Plan
| Feature | Min Plan |
|---|---|
| Scan (basic) | free |
| Schema Generator | free |
| GBP Monitor | free (read); starter (sync) |
| AI Overview Checker | growth |
| Content Generation | authority |
| Citation Sync | growth |
| Competitor Watch | growth (API); UI currently mock |

---

## Features Marketed but NOT Fully Wired

### 🔴 Competitor Watchdog — MOCK DATA
- The `/competitors` page renders from a **hardcoded `MOCK_COMPETITORS` array** rather than live data
- The API route (`/api/competitors`) does call the real Google Places API, but the page component does not consume it
- **Impact**: Users see fake competitor data, not their real competitors

### 🟡 Citation Checker — Limited Real Directory Scraping
- The citation API uses Cheerio to scrape some directories but many checks may fall back to simulated results (network-level blocking, no API keys for certain directories)
- "18 directories" is claimed in comparisons but the directory list in the code covers ~5–8 with claim URLs defined; the rest may return placeholder data

### 🟡 GBP Dashboard — Requires Google OAuth Token
- The `/google-business` page requires the user's Google OAuth `provider_token` which Supabase doesn't reliably persist across sessions (tokens can expire)
- `syncGBPData` is imported but the sync flow may fail if the provider token has expired
- The `/gbp-monitor` page works independently (no Google OAuth required) and is more reliable

### 🟡 Competitor Alerts — Not Automated
- The competitor alerts shown on `/competitors` are part of the mock data
- There is no cron job or automated system that detects competitor changes and generates real alerts
- The `CompetitorAlert` type exists in the codebase but real alert generation is not wired

### 🟡 Weekly AI GBP Posts (Growth Plan Feature)
- Listed as a Growth plan feature but there's no visible UI or cron job that auto-generates/ publishes GBP posts
- The GBP sync exists but automated weekly posting is not implemented

### 🟡 Automated Review Request Campaigns (Growth Plan Feature)
- Reputation Engine now exists natively inside Geothority
- Core review workflow scaffolding, settings, review flow, and runtime diagnostics are present
- Remaining work is production-hardening the live provider/runtime path rather than handing the feature off to a separate Starcepta product

### 🟡 Citation Sync Across 80+ Directories (Growth Plan Feature)
- Listed as a Growth feature; real implementation uses Foursquare API which feeds ~50 directories
- The "80+" claim is slightly overstated relative to what Foursquare directly covers

### 🟡 White-Label PDF Reports (Authority Plan Feature)
- PDF report generation exists but is **not white-labeled** — it shows Geothority branding
- No agency/white-label customization options in the UI

### 🟡 API Access (Agency Plan Feature)
- Listed as an Agency feature; the embed/plugin API exists but there's no documented public API for general agency use
- No API key management UI beyond the embed key

### 🟡 Dedicated Onboarding Call / Account Manager (Agency)
- Human-provided services, not implemented in software (expected)

### 🟢 Listing Sync in Fix Package
- The `scan/fix-all` route generates a `listing_sync` fix type with instructions
- This provides guidance but does not actually perform the sync (no auto-push to directories)

### 🟢 NAP Monitoring (Listed in Pricing)
- No dedicated NAP monitoring cron or dashboard exists separately from the citation checker
- Citation checking is on-demand, not continuously monitored

---

## Summary Statistics

| Category | Count |
|---|---|
| Public pages | 10+ |
| Authenticated app pages | 17 |
| API routes | 30+ |
| Admin pages | 4 |
| Plan tiers | 6 (free, audit, starter, growth, authority, agency) |
| Trust Stack layers | 5 |
| Schema types available | 9 |
| AI engines checked | 5 |
| Directories with claim URLs | 5–8 |
| Insurance service types (content gen) | 12 |
| Fully wired features | ~85% |
| Mock/partially wired features | ~15% |

---

## Priority Gaps to Address

1. **Competitor Watchdog mock data** — High-impact gap; users see fake data
2. **GBP OAuth token persistence** — Users may lose Google connection on session expiry
3. **Competitor alert automation** — No real alert generation pipeline
4. **White-label PDF** — Marketed but not implemented
5. **Automated GBP posts** — Listed in Growth plan but no implementation
6. **Review request campaigns** — Listed in Growth plan but deferred to partner product
7. **Citation count claims** — "80+ directories" vs actual ~50 via Foursquare
