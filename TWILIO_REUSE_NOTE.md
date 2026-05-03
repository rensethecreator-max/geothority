# Twilio reuse note for Geothority Reputation Engine

Date: 2026-05-03

## Scope inspected
- `apps/reviewpulse/lib/twilio.ts`
- `apps/reviewpulse/app/api/webhooks/twilio/sms/route.ts`
- `apps/reviewpulse/app/api/jobs/send-sms/route.ts`
- `apps/reviewpulse/app/api/diagnostics/scan/route.ts`
- `apps/reviewpulse/lib/db/schema.ts`
- `apps/ringrecovery/lib/twilio.ts`
- `apps/ringrecovery/app/api/webhooks/twilio/call/route.ts`
- `apps/ringrecovery/app/api/webhooks/twilio/sms/route.ts`
- `apps/ringrecovery/app/api/conversations/[id]/reply/route.ts`
- Current Geothority Twilio code for comparison:
  - `src/lib/reputation/twilio.ts`
  - `src/app/api/reputation/twilio/inbound/route.ts`
  - `src/app/api/reputation/twilio/status/route.ts`
  - `.env.example`

## Bottom line
Geothority already implements the strongest Twilio patterns found in the portfolio and is ahead of both `reviewpulse` and `ringrecovery` in a few important ways:
- signed webhook verification on inbound + status routes
- delivery status callback handling
- support for either `TWILIO_FROM_NUMBER` **or** `TWILIO_MESSAGING_SERVICE_SID`
- explicit status mapping and provider SID persistence

So the main reuse value is **pattern confirmation + a few caution flags**, not direct code lifting.

## Reusable patterns worth keeping or copying

### 1) Minimal send helper pattern
**Evidence**
- `apps/reviewpulse/lib/twilio.ts`
- `apps/ringrecovery/lib/twilio.ts`

Both apps centralize Twilio sends behind a tiny helper:
- create client once
- call `messages.create({ to, from, body })`

**Reuse guidance for Geothority**
Geothority already has the same centralization in `src/lib/reputation/twilio.ts`, but implemented via direct REST `fetch` instead of the SDK. That is fine and arguably better for surface-area control. Keep the single transport entrypoint pattern.

### 2) “Find tenant by receiving Twilio number” routing
**Evidence**
- `apps/reviewpulse/app/api/webhooks/twilio/sms/route.ts` looks up merchant by `merchants.twilioNumber === To`
- `apps/ringrecovery/app/api/webhooks/twilio/call/route.ts` and `/sms/route.ts` look up business by `businesses.twilioNumber === To`
- schemas store `twilio_number` per tenant in both apps

**Reuse guidance for Geothority**
If Geothority expands to per-location or per-brand Twilio numbers, keep this routing pattern: resolve the business/location/account context from the Twilio destination number first, then match the contact/request.

Right now Geothority inbound reply matching is phone/request-centric, which works for current reputation flows. But multi-number scaling may eventually want an explicit `to_number` or sender identity on `reputation_requests` / `reputation_message_log`.

### 3) STOP / opt-out handling
**Evidence**
- `apps/reviewpulse/lib/twilio.ts` has `isOptOut()` with `STOP | UNSUBSCRIBE | CANCEL | QUIT | END`
- `apps/reviewpulse/app/api/webhooks/twilio/sms/route.ts` updates customer `optOut = true` and confirms unsubscribe
- Geothority currently uses `TWILIO_STOP_KEYWORDS` in `src/lib/reputation/twilio.ts` and updates `reputation_contacts.opt_out`

**Reuse guidance for Geothority**
Current Geothority approach is good. Keep opt-out logic at the webhook boundary and log the event in the ledger, as you already do.

### 4) Parse structured SMS replies from natural text
**Evidence**
- `apps/reviewpulse/lib/twilio.ts` parses first leading digit `1-5`
- Geothority `extractScoreAndFeedback()` is already better: accepts a 1-5 digit embedded in the message and keeps the remainder as feedback

**Reuse guidance for Geothority**
Do **not** downgrade to the `reviewpulse` parser. Geothority’s parser is the better reusable baseline.

### 5) Always return TwiML to Twilio for inbound webhooks
**Evidence**
- `apps/ringrecovery/app/api/webhooks/twilio/call/route.ts`
- `apps/ringrecovery/app/api/webhooks/twilio/sms/route.ts`
- `apps/reviewpulse/app/api/webhooks/twilio/sms/route.ts`

All three return `<Response/>` or TwiML message bodies, even on ignored events.

**Reuse guidance for Geothority**
Keep this. Geothority already returns valid TwiML in the inbound route. That is the right pattern for inbound messaging webhooks.

## Env var patterns to reuse

### Confirmed common vars
Used in both older apps and Geothority:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `NEXT_PUBLIC_APP_URL` for callback/link building

### Geothority-specific improvement already present
- `TWILIO_FROM_NUMBER`
- `TWILIO_MESSAGING_SERVICE_SID`
- `APP_URL` with `NEXT_PUBLIC_APP_URL` fallback

This is stronger than the older apps, which assume a concrete per-tenant sending number and do not support Messaging Service SID.

### Operational pattern worth reusing
**Evidence**
- `apps/reviewpulse/app/api/diagnostics/scan/route.ts` checks for missing `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`
- same file flags merchants missing `twilio_number`

**Recommendation for Geothority**
If diagnostics coverage is expanded, add Twilio checks for:
- missing `TWILIO_ACCOUNT_SID`
- missing `TWILIO_AUTH_TOKEN`
- missing both `TWILIO_FROM_NUMBER` and `TWILIO_MESSAGING_SERVICE_SID`
- missing `APP_URL` / `NEXT_PUBLIC_APP_URL` when Twilio transport is enabled

## Webhook/auth patterns

### Pattern to reuse: verify Twilio signatures
**Evidence**
- `apps/reviewpulse/app/api/webhooks/twilio/sms/route.ts` uses `twilio.validateRequest(...)`
- Geothority uses its own HMAC validator in `src/lib/reputation/twilio.ts` and applies it in both inbound and status routes

**Recommendation for Geothority**
Keep Geothority’s current verification layer. It is broader than the portfolio examples because it also covers status callbacks.

### Pattern to avoid: unsigned Twilio webhooks
**Evidence**
- `apps/ringrecovery/app/api/webhooks/twilio/call/route.ts` has no Twilio signature validation
- `apps/ringrecovery/app/api/webhooks/twilio/sms/route.ts` has no Twilio signature validation

This is the biggest negative finding in the inspected code. Do not reuse it.

### Internal-job protection pattern
**Evidence**
- `apps/reviewpulse/app/api/jobs/send-sms/route.ts` gates send jobs behind `INTERNAL_JOB_SECRET` or QStash signature presence

**Recommendation for Geothority**
For non-Twilio internal send endpoints/jobs, keep the same shape Geothority already uses elsewhere: secret-gated internal automation, separate from provider webhook auth.

## Messaging / state patterns

### Useful data model ideas from older apps
**ReviewPulse**
- `rp_sms_log.twilio_sid`
- request statuses like `pending`, `sent`, `positive`, `negative`, `opted_out`, `failed`

**RingRecovery**
- conversation transcript stored as a message array
- immediate state update after automated reply

**Geothority impact**
Geothority already captures the more reusable parts:
- provider SID logging
- delivery state updates
- ledger events
- normalized request reply recording

I would treat the older schemas as conceptual precedents, not import candidates.

## Pitfalls found in the portfolio code

### 1) Placeholder Twilio credentials can mask configuration errors
**Evidence**
- `apps/reviewpulse/lib/twilio.ts` falls back to placeholder SID/token strings

**Risk**
This can delay failure until send time and make misconfiguration less obvious.

**Geothority recommendation**
Keep Geothority’s current fail-fast env validation. Do not copy placeholder fallbacks.

### 2) No delivery status callback handling in older apps
**Evidence**
- no Twilio message status route in `reviewpulse` or `ringrecovery`
- `reviewpulse` stores `twilioSid` in schema but the inspected send path does not persist/update delivery state from Twilio callbacks

**Risk**
You can mark a request “sent” without knowing if it was actually delivered, blocked, or failed.

**Geothority recommendation**
Keep `StatusCallback` usage and `/api/reputation/twilio/status` as the standard pattern.

### 3) Inconsistent base URL handling can break signature verification
**Evidence**
- `apps/reviewpulse/app/api/webhooks/twilio/sms/route.ts` validates against `NEXT_PUBLIC_APP_URL + /api/webhooks/twilio/sms`
- if deployed URL, proxy headers, or env drift differ from what Twilio actually called, signature checks can fail
- Geothority improves this with `buildTwilioWebhookUrl(req)` and `APP_URL` / forwarded-header fallback

**Geothority recommendation**
Current Geothority approach is the right baseline. Keep it.

### 4) No phone normalization before tenant/contact matching in older apps
**Evidence**
- `reviewpulse` and `ringrecovery` compare `From` / `To` directly against stored phone values
- Geothority uses `normalizeSmsPhone()` before contact matching

**Risk**
Formatting drift (`+1...` vs `(...)` vs bare digits) can cause reply matching misses.

**Geothority recommendation**
Keep normalization, and consider normalizing at write-time too if not already enforced upstream.

### 5) Older apps use direct webhook-side send loops without obvious retry/idempotency protection
**Evidence**
- `ringrecovery` call webhook immediately inserts a missed call and sends SMS
- `reviewpulse` send job updates status after send but the inspected route does not show an idempotency key around Twilio send

**Risk**
Provider retries or internal retries can duplicate sends.

**Geothority recommendation**
Continue anchoring sends/replies to request records + ledger/message-log state, and preserve idempotent request ingestion on the reputation side.

## Best reuse recommendations for Geothority
1. **Reuse conceptually, not by copy-paste.** Geothority’s current Twilio implementation is already the best version in the portfolio.
2. **Keep the current Geothority transport contract** (`deliver()` + status callback + webhook verification). That is the right shared abstraction.
3. **If multi-number routing becomes important**, add explicit destination-number tracking to reputation requests/message logs and route inbound by Twilio `To` first, borrowing the tenant-resolution pattern from `reviewpulse` / `ringrecovery`.
4. **Expand diagnostics** with Twilio transport-specific checks, borrowing the spirit of `reviewpulse` diagnostics.
5. **Do not reuse**:
   - placeholder credential fallbacks
   - unsigned webhook routes
   - direct raw phone matching without normalization

## Safe tiny reuse improvement?
I did **not** make a code refactor.

Reason: the Geothority repo already has in-progress local modifications (`public/sw.js`, `src/lib/reputation/request-service.ts`, `src/lib/reputation/transport.ts`, `src/lib/reputation/twilio.ts`). The safest move here was to add only this note and avoid touching runtime code in a partially dirty tree.

## Recommended next step
If you want one low-risk follow-up after this note, the best candidate is:
- add/extend a diagnostics check for Twilio transport readiness (`SID`, `token`, sender or messaging service, base URL)

That would reuse the strongest operational idea from `reviewpulse` without risking message flow behavior.
