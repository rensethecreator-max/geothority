# Geothority Powerhouse Completion Roadmap

**Date:** 2026-04-17
**Goal:** Make Geothority feel automatic, trustworthy, and genuinely magical for local SEO plus AI search positioning, while closing the gap between what we promise and what the app can actually deliver end-to-end.

---

## Executive summary

To become a real powerhouse, Geothority needs to evolve from a strong scan-and-recommend product into an **automated local visibility operating system**.

Right now, the strongest live path is:
- run a scan
- see a Trust Stack score
- get quick wins
- generate fixes
- monitor some signals

That is good, but it is not yet magical.

**Magical feels like this:**
- the app discovers issues automatically
- tracks the right competitors automatically
- detects visibility drift automatically
- generates fixes automatically
- publishes or queues changes automatically where safe
- re-checks outcomes automatically
- notifies the user only when something important changed
- improves the business's Google, Maps, directory, review, and AI visibility without the user having to babysit it

That requires 5 missing systems:
1. **Reliable data pipelines**
2. **Persistent monitoring + change detection**
3. **Automation workflows with approvals and safeguards**
4. **Better third-party integration depth**
5. **Clear packaging of software vs managed service promises**

---

# 1. Product north star

## Geothority should become:
**The autonomous local authority engine for service businesses.**

It should continuously:
- audit local visibility
- identify the highest-leverage actions
- execute safe fixes
- coordinate human approvals for risky actions
- monitor competitors and AI visibility
- adapt strategy based on outcomes

## End-state user experience
A great user experience would feel like:
- "I connected my business once"
- "Geothority found my weak spots"
- "It generated and deployed the highest-impact fixes"
- "It keeps my citations, schema, pages, GBP, and AI signals healthy"
- "It warns me when a competitor moves or my visibility drops"
- "It shows exactly what it improved and what result it got"

That is the product we should build toward.

---

# 2. Why the current app is not there yet

## Current strength
- strong scan UX
- strong Trust Stack framing
- strong quick-win concept
- useful fix package generation
- decent monitoring foundations
- good positioning for local SEO + AI search

## Current gap
The app still has too much of this pattern:
- analyze now
- suggest next steps
- rely on the user to do the work manually

A powerhouse product needs to shift to:
- detect
- decide
- act
- verify
- repeat

## Root causes of the gap
1. **Mock-first surfaces** in some areas, especially competitor UX
2. **Incomplete automation loops** for recurring actions
3. **Integration depth limits** with GBP, directories, and review ecosystems
4. **Token/auth durability issues** for long-lived integrations
5. **Marketing ahead of implementation** on some higher-tier promises

---

# 3. Core product pillars to build

## Pillar A. Autonomous Monitoring Engine
The app should run continuously without the user having to request checks.

### Must include
- scheduled rescans
- layer-by-layer score history
- competitor delta detection
- citation drift detection
- GBP health checks
- AI visibility rechecks
- anomaly detection and alert thresholds

### Outcome
The user feels like Geothority is watching the market on their behalf.

---

## Pillar B. Automated Remediation Engine
The app should not stop at telling the user what is wrong.

### Must include
- fix recommendation ranking by impact and effort
- one-click approval flows for risky actions
- fully automatic execution for safe actions
- post-fix verification scans
- rollback or retry logic where possible

### Safe fully automatic actions
- generate schema
- generate FAQ blocks
- generate missing trust-page drafts
- refresh local landing page content drafts
- update internal suggestions and tasks
- queue directory sync jobs where supported
- refresh AI visibility prompts/targets internally

### Approval-required actions
- publish to CMS
- connect external APIs
- push GBP posts
- overwrite existing published pages
- modify billing or subscription settings

### Outcome
The app feels proactive instead of passive.

---

## Pillar C. Live Competitor Intelligence
This is one of the biggest gaps and one of the highest-value upgrades.

### Must include
- real competitor discovery by city + category + intent class
- local SERP and Maps competitor sets
- recurring rescans of competitor trust signals
- movement detection over time
- gap explanation by layer
- user-facing "why they are winning" summaries
- real competitor alerts, not mock alerts

### Key UX promise
The user should be able to open Geothority and instantly see:
- who is winning
- why they are winning
- what changed this week
- what we should do about it

### Outcome
This turns the app from a self-audit tool into a strategic local growth platform.

---

## Pillar D. Citation + Entity Graph Automation
This is where local SEO moves from analysis into durable authority infrastructure.

### Must include
- authoritative source-of-truth business profile
- NAP canonical record
- directory sync orchestration
- sync status per directory
- claim/ownership workflow tracking
- mismatch detection
- confidence scoring
- retry queues and exception handling

### Important truth
We should stop implying perfect one-click sync everywhere unless we truly control the integration.

### Better product model
Split directory work into 3 buckets:
1. **Direct auto-sync**
2. **Partner/distribution sync**
3. **Guided/manual claim workflow**

### Outcome
Claims become believable because the user can see exactly what is automated and what still requires intervention.

---

## Pillar E. GBP + Reviews + Local Reputation Automation
This is a major monetization and retention pillar.

### Must include
- durable Google connection lifecycle
- token refresh and reconnection UX
- GBP profile health status
- post suggestion and approval system
- Q&A/review response suggestions
- review request workflow or explicit Starcepta handoff
- issue detection around missing categories, hours, photos, or profile completeness

### Outcome
The app becomes a weekly operator for local presence, not just a scan product.

---

## Pillar F. AI Search Positioning Engine
This is where Geothority can become unusually differentiated.

### Must include
- recurring AI visibility checks
- query-set management by industry/city/service
- mention/citation presence tracking across AI surfaces
- entity consistency analysis
- content recommendations based on AI retrieval gaps
- schema/content changes tied to AI discoverability goals
- before/after measurement loops

### Outcome
Geothority becomes one of the few local tools positioned for both classic local SEO and AI answer ecosystems.

---

# 4. Concrete execution plan

## Phase 1. Truth and reliability foundation (Must Have)
**Goal:** remove mismatch between product claims and reality.

### Epic 1. Live competitor system replacement
**Why first:** mock competitor UI is one of the most credibility-damaging gaps.

#### Stories
**Story 1: Real competitor discovery pipeline**
- As a user, I want Geothority to find my actual local competitors so that the dashboard reflects my real market.
- Acceptance criteria:
  - Given a scanned business, when competitor discovery runs, then the system stores a real competitor set tied to city + category.
  - Given a saved competitor set, when the user opens `/competitors`, then the page renders live competitors, not mock objects.
  - Given insufficient confidence, then the UI marks the competitor set as provisional.
- Tasks:
  - build competitor candidate generator
  - store competitors in DB
  - replace mock array in UI
  - add confidence scoring
  - add refresh action
- Estimation: L
- Priority: Must

**Story 2: Competitor rescans + delta engine**
- Acceptance criteria:
  - competitors can be rescanned on schedule
  - score and signal changes are stored historically
  - new gains/losses create structured deltas
- Estimation: L
- Priority: Must

**Story 3: Real competitor alerts**
- Acceptance criteria:
  - alerts are generated from stored deltas
  - alerts show what changed and why it matters
  - users can dismiss or save alerts
- Estimation: M
- Priority: Must

### Epic 2. Citation truth model
**Why second:** claims need to match actual operational behavior.

#### Stories
**Story 1: Canonical business profile + directory sync state model**
- store canonical NAP and business identity
- track each directory as direct-sync, distribution-sync, guided/manual, or unknown
- show sync status clearly in UI
- Estimation: M
- Priority: Must

**Story 2: Citation coverage honesty layer**
- remove inflated claims from UI/copy
- show real supported directories and sync mode
- Estimation: S
- Priority: Must

**Story 3: Citation drift monitor**
- scheduled checks for mismatches, lost listings, and missing data
- alert only on meaningful change
- Estimation: M
- Priority: Must

### Epic 3. GBP auth durability
**Why third:** without durable Google connectivity, automation breaks.

#### Stories
**Story 1: Robust token lifecycle**
- durable storage for refresh state
- expiry handling
- reconnect prompts
- background refresh jobs
- Estimation: M
- Priority: Must

**Story 2: GBP health center**
- show connection health, last sync, stale data, and action needed
- Estimation: M
- Priority: Must

---

## Phase 2. Automation engine (Must Have)
**Goal:** move from recommendations to action.

### Epic 4. Automation orchestration layer
This is the heart of the magic.

#### Needs
- job queue
- workflow state machine
- event log
- automation policy system
- safe retries
- user approvals for sensitive actions

#### Stories
**Story 1: Automation jobs framework**
- background jobs for scans, rescans, publishing, syncs, alerts
- Estimation: L
- Priority: Must

**Story 2: User automation policy settings**
- users choose auto-apply, approval-required, or manual-only by action type
- Estimation: M
- Priority: Must

**Story 3: Action center**
- unified queue of pending fixes, approved actions, completed automations, failures
- Estimation: M
- Priority: Must

### Epic 5. Fix execution engine
#### Stories
**Story 1: Safe auto-generated schema deployment**
- generate schema
- validate schema
- publish to CMS where connected or provide copy-ready path
- verify after publish
- Estimation: M
- Priority: Must

**Story 2: Trust-page generation workflows**
- missing FAQ/About/service-area pages become draft tasks or publish-ready drafts
- Estimation: M
- Priority: Must

**Story 3: Post-fix verification loop**
- every fix triggers recheck
- UI shows whether score improved
- Estimation: M
- Priority: Must

---

## Phase 3. Premium automation promises (Should Have)
**Goal:** make higher-tier plans real, defensible, and sticky.

### Epic 6. Weekly GBP post system
#### Stories
- generate post suggestions from business context, seasonality, and local trends
- approval queue for publishing
- optional auto-post mode for approved templates
- performance history
- Estimation: M
- Priority: Should

### Epic 7. Review request and response system
#### Important note
Either build this inside Geothority or explicitly route it through Starcepta and stop pretending it is native.

#### Stories
- review request campaign creation
- contact import or CRM bridge
- send tracking and response rates
- negative-review escalation logic
- Estimation: L
- Priority: Should

### Epic 8. White-label reporting
#### Stories
- custom logo, colors, domain text, and PDF theme
- agency export presets
- scheduled report delivery
- Estimation: M
- Priority: Should

### Epic 9. Real agency API
#### Stories
- API key management
- documented endpoints
- scoped permissions
- usage metering
- Estimation: M
- Priority: Should

---

## Phase 4. AI search moat (Should Have, strategically huge)
**Goal:** become best-in-class for local AI visibility.

### Epic 10. AI visibility intelligence
#### Stories
- saved query sets by vertical + city
- recurring AI engine checks
- mention tracking and structured snapshots
- AI gap analysis tied to content/schema fixes
- Estimation: L
- Priority: Should

### Epic 11. AI content adaptation engine
#### Stories
- generate entity-rich trust content
- FAQ coverage based on query gaps
- local service page expansion driven by retrieval weakness
- Estimation: M
- Priority: Should

### Epic 12. AI search scorecard
#### Stories
- user sees where they appear in AI results
- trend line over time
- recommended next actions tied to visibility gaps
- Estimation: M
- Priority: Should

---

# 5. The automation-first feature set we should deliberately build

If we want the app to feel like magic, these are the key automations to prioritize.

## Fully automatic by default
- weekly business rescans
- competitor rescans
- citation drift checks
- AI visibility rechecks
- anomaly detection
- fix recommendation reprioritization
- report generation
- important alerts only
- internal task generation from scan findings

## Automatic with approval
- publish schema to CMS
- publish FAQ/About/local pages
- push GBP posts
- submit or sync directory updates
- trigger review campaigns
- update live website assets

## Manual but deeply assisted
- claim workflows for hard directories
- reconnect expired Google auth
- resolve ambiguous competitor matching
- approve sensitive content changes

---

# 6. Technical systems we need to add or harden

## Data layer
- `business_profile` canonical record
- `competitors` and `competitor_snapshots`
- `citation_entries` and `citation_sync_jobs`
- `automation_jobs` and `automation_events`
- `ai_visibility_checks`
- `gbp_connection_status`
- `alerts`
- `action_queue`

## Orchestration
- queue worker or cron-job execution model
- retry/backoff policy
- dead-letter handling for failed external actions
- idempotent jobs
- audit logs for every automated action

## Integration hardening
- Google token refresh durability
- CMS connection health checks
- directory provider abstraction
- clearer Foursquare/distribution mapping
- review platform integration model

## UX systems
- Action Center
- Automation Settings
- Integration Health panel
- Competitor Intelligence dashboard
- Citation Control Center
- AI Visibility dashboard

---

# 7. Messaging changes we should make immediately

These changes should happen now, even before all engineering is done.

## Keep and emphasize
- Trust Stack scans
- quick wins
- fix generation
- local SEO + AI search positioning
- ongoing monitoring

## Rephrase carefully
- change broad citation claims into exact supported coverage
- stop implying fully automated competitor alerts until live
- stop implying native review campaign automation unless built
- frame some features as "guided workflows" or "managed automation" until fully autonomous

## Why this matters
The fastest way to lose trust is not weak code. It is strong claims with inconsistent delivery.

---

# 8. Recommended build order

## Sprint group A, immediate
1. replace competitor mock UI with live data
2. add competitor snapshot/history model
3. build alert generation from real deltas
4. implement citation sync truth model
5. harden GBP token lifecycle
6. add integration health status UI

## Sprint group B, next
7. build automation jobs framework
8. build Action Center
9. add post-fix verification loop
10. add safe auto-publish for schema and draft content
11. add citation drift monitoring

## Sprint group C, premium promise fulfillment
12. weekly GBP post system
13. review request system or explicit Starcepta integration
14. white-label reporting
15. agency API

## Sprint group D, moat expansion
16. AI query-set management
17. recurring AI visibility measurement
18. AI-driven remediation recommendations
19. AI scorecard and reporting

---

# 9. Definition of powerhouse

We should call Geothority a powerhouse when all of the following are true:
- real competitor intelligence is live
- citations are transparently tracked with real sync states
- GBP connection health is durable
- monitoring runs in the background without babysitting
- the app can safely execute approved fixes
- important higher-tier automations are genuinely live
- AI search visibility is measured repeatedly, not just marketed
- the user sees a clear log of what the app changed and what improved

If we achieve that, Geothority stops being a promising SaaS and becomes a real operating system for local authority.

---

# 10. Blunt recommendation

If we want the biggest leap in trust and user value fast, focus on these three first:

## 1. Real competitor intelligence
This closes the most obvious credibility gap.

## 2. Automation orchestration + Action Center
This creates the "magic" feeling.

## 3. Durable citation/GBP/AI monitoring loops
This turns the app into an always-on system instead of a one-time tool.

Everything else compounds from there.

---

# 11. Proposed promise stack after completion

Once these systems are built, the real marketing line becomes:

**Geothority automatically monitors and improves how your business shows up across Google, Maps, directories, reviews, and AI search. It finds what is broken, prioritizes the highest-impact fixes, executes safe improvements, and keeps tracking results over time.**

That would be both powerful and honest.
