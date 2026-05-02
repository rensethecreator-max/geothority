# Geothority Reputation Engine Build Spec

## Goal
Embed Starcepta's strongest review/reputation capabilities directly into Geothority as a native **Reputation Engine** while keeping the UX unified, premium, and operationally simple.

## Product Positioning
Geothority becomes the single flagship platform for:
- Visibility diagnosis
- Fix execution
- Citation/listing health
- Competitor monitoring
- AI visibility
- Review/reputation automation
- Trust proof publishing

Starcepta remains reusable as underlying logic and optionally sellable standalone, but inside Geothority the experience is branded as **Reputation Engine**.

---

## Core UX Principle
Do not expose product seams.

The user should feel one continuous workflow:
1. Diagnose trust/visibility weakness
2. Launch review/reputation automation
3. Capture public reviews and private feedback
4. Extract proof signals
5. Feed proof into trust assets and public authority pages

Not:
- Geothority here
- Starcepta there
- handoff to another product

---

## What to Port From Starcepta First

### Reuse directly or with light adaptation
1. **Review request lifecycle model**
   - merchant/business review settings
   - customers/contacts
   - review requests
   - SMS log
   - review templates
   - campaign history

2. **Review scheduler**
   - delay after transaction/event
   - opt-out handling
   - spam window protection
   - request creation
   - QStash delayed job enqueue

3. **One-tap review template flow**
   - templated copy
   - tokenized review page
   - copy-to-clipboard + open Google
   - usage tracking

4. **Review settings onboarding logic**
   - Google review link
   - delay timing
   - positive threshold
   - SMS template
   - event source connection

5. **Private feedback routing**
   - scores below threshold route to private feedback
   - store issues for operator follow-up

### Reuse conceptually, but redesign presentation
1. onboarding UI
2. review template picker visuals
3. dashboard summaries
4. vertical marketing copy

---

## Geothority Information Architecture

### New nav item
- `/reputation`

### Reputation Engine subareas
- Overview
- Campaigns
- Templates
- Feedback
- Proof
- Settings

### Existing Geothority surfaces to enhance
1. **Dashboard**
   - add Review Health summary card
   - add Review Momentum widget
   - add competitor review-gap alert card

2. **Trust Score**
   - make review health a native score driver
   - show review-specific issues in issue stack

3. **Action Center**
   - approval flows for campaigns/templates/connections
   - tasks for negative feedback response
   - tasks for proof publishing

4. **Profiles / public pages**
   - publish review proof snippets
   - publish review benchmark blocks
   - publish reputation trend indicators

---

## Recommended Naming Inside Geothority
Use Geothority-native names, not Starcepta-first names.

### Prefer
- Reputation Engine
- Review Momentum
- Private Feedback Inbox
- Review Templates
- Trust Proof
- Reputation Automations

### Avoid in primary UX
- “Fix this with Starcepta”
- external app handoff language
- separate-product feeling inside core flows

Optional footer/settings note:
- Powered by Starcepta review automation

---

## Database / Data Model
Create Geothority-native tables or Supabase equivalents.

### Proposed tables
1. `reputation_settings`
   - id
   - user_id
   - business_id / scan_id / profile_id linkage
   - google_review_link
   - sms_delay_minutes
   - positive_threshold
   - sms_template
   - channel_source
   - twilio_number
   - active
   - created_at
   - updated_at

2. `reputation_contacts`
   - id
   - business_id
   - phone
   - name
   - email
   - opt_out
   - source
   - created_at

3. `reputation_requests`
   - id
   - business_id
   - contact_id
   - trigger_source
   - external_event_id
   - status
   - score
   - feedback_text
   - review_token
   - google_link_sent
   - template_used
   - sent_at
   - replied_at
   - created_at

4. `reputation_message_log`
   - id
   - request_id
   - direction
   - body
   - provider_sid
   - created_at

5. `reputation_templates`
   - id
   - business_id
   - category
   - template_text
   - is_default
   - usage_count
   - created_at

6. `reputation_feedback_items`
   - id
   - request_id
   - business_id
   - severity
   - topic
   - feedback_text
   - follow_up_status
   - assigned_to
   - created_at

7. `reputation_proof_assets`
   - id
   - business_id
   - source_review_id / request_id
   - snippet
   - topic
   - sentiment
   - approved
   - published_to
   - created_at

---

## Feature Map By Phase

## Phase 1 — Native Reputation Engine MVP
Goal: make review automation operational inside Geothority.

### Build
1. **Reputation settings page**
   - business name context
   - Google review link
   - send delay
   - positive threshold
   - SMS template editor
   - activate/deactivate automation

2. **Review scheduler service**
   - port Starcepta scheduling logic
   - rename to Geothority reputation module

3. **One-tap review page**
   - tokenized public page
   - Geothority styling
   - mobile-first UX

4. **Private feedback routing**
   - scores below threshold create feedback item
   - show in Reputation > Feedback

5. **Dashboard review health card**
   - review count
   - average rating
   - recent velocity
   - response rate
   - competitor review gap

6. **Action Center integration**
   - “Connect review flow”
   - “Approve review template”
   - “Resolve private feedback”

### Acceptance criteria
- user can activate review automation inside Geothority
- review request can be scheduled and sent
- customer can leave public review via one-tap flow
- low-score response routes to private feedback
- dashboard and action center reflect reputation state

---

## Phase 2 — Proof + Operator Workflows
Goal: turn reviews into trust assets.

### Build
1. **Feedback inbox**
   - list low-score/private feedback items
   - status: new / reviewing / resolved
   - assign owner

2. **Template library**
   - default templates
   - editable per business
   - category-based variants

3. **Proof extraction**
   - flag positive review text snippets
   - approve snippets for publishing

4. **Review momentum analytics**
   - requests sent
   - reply rate
   - positive rate
   - review conversion rate
   - trend over time

5. **GBP / trust score tie-in**
   - review health feeds Trust Stack Score
   - show review issues as score suppressors

### Acceptance criteria
- operator can manage private feedback from one place
- positive review snippets can be approved as proof assets
- review metrics visible in Geothority analytics surfaces

---

## Phase 3 — Self-Marketing Loop
Goal: use reputation signals to strengthen Geothority’s authority publishing engine.

### Build
1. **Proof publishing blocks**
   - inject approved review snippets into trust pages
   - city pages
   - vertical pages
   - profile pages

2. **Review benchmark blocks**
   - compare business vs city/vertical averages
   - expose “review momentum gap” publicly where useful

3. **Competitor review-gap detection**
   - detect when competitors gain review velocity
   - create response plan in Action Center

4. **Campaign recommendations**
   - recommend when to increase request volume
   - recommend proof asset refreshes
   - recommend response-rate cleanup

5. **Authority page enrichment**
   - trust factor pages use real review patterns
   - benchmark pages cite review momentum trends

### Acceptance criteria
- reputation data feeds public authority surfaces
- competitor review changes can trigger response plans
- proof assets are publishable, reusable, and trackable

---

## UI Model

## A. Dashboard
Add a native **Review Health** module.

### Card contents
- score/ring
- total reviews
- avg rating
- last 30 days
- response rate
- competitor average comparison
- CTA: Activate / Improve / View Reputation Engine

### Companion widget
**Review Momentum**
- requests sent this week
- positive responses
- public reviews generated
- private feedback captured

---

## B. Reputation Engine Page (`/reputation`)

### Tab 1: Overview
- review health score
- momentum trend
- competitor review gap
- active automations
- recommendations

### Tab 2: Campaigns
- active/inactive campaigns
- send delay
- threshold
- event sources
- recent sends

### Tab 3: Templates
- category cards
- edit template text
- preview merge fields
- usage counts

### Tab 4: Feedback
- private feedback inbox
- severity
- topics
- follow-up status

### Tab 5: Proof
- approved snippets
- publish targets
- tagged by service/topic/city

### Tab 6: Settings
- review link
- provider connection
- Twilio/source settings
- opt-out behavior

---

## C. Action Center
Add review-driven tasks like:
- Connect a review source
- Approve SMS copy
- Review private complaint
- Publish 3 new proof snippets
- Competitor review gap detected — launch campaign

This fits Geothority’s operator-style workflow much better than a separate review app handoff.

---

## D. Trust Score / Diagnostic UI
Review issues should appear as first-class trust suppressors:
- weak review recency
- low response rate
- competitor review momentum
- insufficient review volume
- no active feedback capture

Each issue should have:
- why it matters
- what action to take
- launch button into Reputation Engine

---

## E. Public One-Tap Review Page
Port from Starcepta, but reskin to Geothority.

### Keep
- mobile-first
- giant thumb-friendly CTA
- choose a template
- copy + open Google
- write-your-own option

### Update
- Geothority visual system
- neutral / premium styling
- “help improve local trust” framing
- optional soft “powered by Geothority” footer

---

## What to Remove / Replace in Current Geothority

### Replace
1. external Starcepta upsell banner behavior
2. bundle messaging that assumes separate-product handoff
3. review CTAs that leave the flagship experience

### With
1. native Reputation Engine cards
2. native review automation CTAs
3. native proof/publishing flows

Relevant files to revise later:
- `src/components/upsell/StarceptaBanner.tsx`
- `src/app/(public)/bundle/page.tsx`
- pricing and homepage copy that treats reviews as external

---

## Suggested Navigation
### Main app nav
- Dashboard
- Scans
- Action Center
- Competitors
- Citations
- AI Visibility
- Reports
- **Reputation**
- Settings

Optional: keep “Reputation” below “Trust Score” if you want to emphasize that it is a trust lever.

---

## Suggested Build Order

### Sprint 1
- schema migration
- reputation settings page
- scheduler port
- token review page port
- dashboard review health card

### Sprint 2
- feedback inbox
- template library
- action center tasks
- trust score integration

### Sprint 3
- proof extraction
- proof publishing blocks
- review momentum analytics
- competitor review-gap recommendations

### Sprint 4
- benchmark enrichment
- city/vertical authority page enrichment
- auto-campaign suggestions

---

## Design Direction
The UI should feel like:
- premium operator console
- calm, restrained, high-signal
- card-based but not noisy
- review automation as one authority lever among many

### Avoid
- green standalone SaaS look from old Starcepta UI
- heavy inline-style pages
- gimmicky “review funnel” aesthetic

### Prefer
- Geothority’s existing premium shell
- scorecards
- queues
- approvals
- diagnostics-to-action handoff
- polished mobile flows for public review links

---

## Final Recommendation
Build Starcepta into Geothority as a **native Reputation Engine**, starting with the scheduler, settings model, one-tap review flow, and private feedback routing. Then wire review health into Trust Stack Score, Action Center, and public proof publishing so the review system directly strengthens Geothority’s self-marketing authority loop.
