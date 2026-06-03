# Geothority First-Users Beta Launch Checklist

Target: launch a controlled working beta with 20 to 30 separate company accounts.

This checklist is for the first real users. It intentionally excludes multi-seat agency workspaces, team dashboards, white-label portals, public API access, and bulk multi-company management. Those are postponed until the single-company beta is stable.

## Launch Definition

- Each beta tester represents one company.
- Each company signs up with one owner/admin account.
- Each company can complete onboarding, run a scan, review results, see action items, and contact support.
- The beta promise is visibility clarity and prioritized action, not guaranteed rankings.
- Larger operators can be accepted only as manually managed private rollout accounts.

## Critical Lane 1: Production Health

- Railway production deployment is `SUCCESS`.
- `https://geothority.io` returns `200`.
- `https://www.geothority.io` returns `200`.
- `https://geothority.io/api/health` returns `200`.
- Health JSON reports production environment and database connected.
- No active deployment is stuck in `BUILDING`, `DEPLOYING`, or `FAILED`.
- `npm run ops:deployment-truth` passes for root and `www`.
- `npm run proof:readiness -- --base-url=https://geothority.io` passes with zero critical failures.

## Critical Lane 2: Public Site

- Home page loads on desktop and mobile.
- Pricing page loads and matches beta scope.
- Service facts page loads and clearly explains what users get.
- FAQ page loads and says beta is one company per account.
- Contact page loads and gives users a clear way to reach support.
- Privacy page loads.
- Terms page loads.
- Comparison page loads.
- Insurance agents page loads.
- Header navigation works.
- Footer navigation works.
- No public page has unreadable low-contrast sections.
- No public copy promises multi-seat, white-label, public API, guaranteed rankings, or agency dashboards as standard beta features.

## Critical Lane 3: Signup And Auth

- Fresh signup page loads.
- A new user can create an account with email and password.
- The auth callback URL is correct for production.
- Login works for the new user.
- Logout works.
- Password reset page loads.
- If email verification is enabled, the email arrives and the verification link works.
- If email verification is disabled for beta speed, that decision is documented before invites go out.
- Signup rate limits do not block 20 to 30 legitimate companies.
- Supabase Auth settings allow the expected beta signup volume.

## Critical Lane 4: Company Onboarding

- New user is routed to onboarding after signup.
- Company name can be entered.
- Website URL can be entered.
- Location/service details can be entered where required.
- Onboarding saves without errors.
- User lands in the correct next step after onboarding.
- Incomplete onboarding can be resumed.
- Bad website URLs fail gracefully with clear messaging.
- The onboarding flow does not require agency/team setup.

## Critical Lane 5: First Scan

- User can start a scan.
- Scan accepts the company website.
- Scan completes without server error.
- Scan creates a persistent scan record.
- Scan detail page opens.
- Trust Stack or visibility score displays.
- Layer breakdown displays.
- Quick wins/action items display.
- Scan errors are user-friendly and do not expose raw backend messages.
- A failed scan can be retried.
- Scan flow does not require paid billing unless that is intentional.

## Critical Lane 6: Core App Routes

- `/dashboard` loads for a beta user.
- `/action-center` loads and shows next actions.
- `/scan/[id]` loads for the user scan.
- `/reports` loads.
- `/content` loads.
- `/ai-overview` loads.
- `/ai-visibility` loads.
- `/competitors` loads.
- `/reputation` loads.
- `/gbp-health` loads.
- `/google-business` loads.
- `/billing` loads.
- `/settings` loads.
- No route shows a raw schema, database, auth, or stack error.
- Locked features explain what is needed instead of looking broken.

## Critical Lane 7: Plan And Access Rules

- Decide the beta access model before inviting users.
- Recommended model: free/manual beta access for the first 20 to 30 companies.
- If paid beta is used, checkout must be tested with a real production checkout path.
- If free beta is used, paid gates must not block the scan, dashboard, or action center.
- Plan labels in billing must match what the user actually has.
- Beta users should not see agency, team-seat, white-label, or public API promises as included.
- Admin/manual upgrade process is known if a beta user needs access to a higher tier feature.

## Critical Lane 8: Billing And Stripe

- Pricing page CTAs route correctly.
- Checkout session creation works if paid plans are offered during beta.
- Stripe webhook endpoint is configured in production if payments are live.
- Billing success page loads.
- Billing portal button behaves correctly for paying users.
- Free beta users are not forced into Stripe before they can test the product.
- Refund/trial policy is clear if charging beta users.

## Critical Lane 9: Google Business Profile

- Google Business Profile connect button loads.
- OAuth redirect URL is correct.
- User can connect GBP where Google access is available.
- GBP status endpoint returns clean unauthenticated status before connection.
- GBP health page explains missing connection clearly.
- GBP connection failure does not break the dashboard.
- GBP monitoring is described as dependent on user connection and available Google data.

## Critical Lane 10: Reputation And Reviews

- Reputation page loads for a new beta account.
- Missing optional schema shows setup-required or empty state, not raw errors.
- Review request templates load or fail gracefully.
- Feedback intake page loads.
- Review request sending is either verified or clearly disabled for beta.
- Twilio/reputation transport readiness is green if live review sends are enabled.
- Users understand reputation automation may require setup before sending.

## Critical Lane 11: Content And AI Workflows

- Content page loads.
- Content generation page loads where available.
- If content generation is plan-gated, locked state is clear.
- If generation is enabled, it uses the configured OpenAI model through the server-side content flow.
- Generated content is saved to the user's account, not just displayed transiently.
- AI overview and AI visibility pages clearly present scores, findings, or setup states.
- AI outputs are positioned as recommendations, not guaranteed AI search placement.
- Costly AI endpoints have enough protection for a controlled beta.

## Critical Lane 12: Reports And Proof

- Reports page loads.
- A user can view or generate available reports.
- Report content matches the user's company and scan data.
- Empty report states explain what data is needed.
- Reports do not promise white-label output during standard beta.
- Progress over time is explained as something that compounds after repeated scans and fixes.

## Critical Lane 13: Support And Feedback

- Contact page is live.
- Support email or support inbox owner is confirmed.
- Beta users know where to send feedback.
- Support response expectation is written in the invite.
- Internal owner checks support before invites, after wave 1, mid-day, and end of day.
- Every stuck user is logged in the beta tracker.
- Bugs are grouped by severity: blocker, confusing, cosmetic, future.
- Daily summary is sent after the first wave of beta usage.

## Critical Lane 14: Data, Privacy, And Safety

- Privacy policy is live.
- Terms of service are live.
- Account data is scoped per user/company.
- Users cannot see other users' scans, reports, or company data.
- Public profile/data endpoints do not expose private beta data.
- Account deletion and data handling process is known, even if manually handled during beta.
- Supabase backup/recovery posture is known before invites.
- API keys, Google tokens, Stripe secrets, and service role keys are not exposed client-side.

## Critical Lane 15: Abuse And Cost Controls

- Public endpoints have basic abuse protection or safe limits.
- Scan endpoint cannot be hammered endlessly without detection.
- AI/content endpoints cannot be freely abused by anonymous users.
- Support/chat endpoints cannot be spammed without limits.
- API docs state API is private beta only.
- Logs are monitored for abnormal spikes after invites.
- If hard rate limits are not fully built, launch is limited to invited users only and watched manually.

## Critical Lane 16: Beta Operations Tracker

- Create a tracker with these columns:
- Company name.
- Owner name.
- Owner email.
- Website URL.
- Signup status.
- Onboarding status.
- Scan status.
- Dashboard viewed.
- Action center viewed.
- GBP connected.
- Plan/access level.
- Support issue.
- Blocker.
- Feedback theme.
- Follow-up date.
- Internal owner.
- Current status.

## Invite Wave Plan

- Wave 0: invite internal/test accounts only.
- Wave 1: invite 5 companies.
- Wait 30 to 60 minutes and review signup, onboarding, scan, dashboard, and support logs.
- Wave 2: invite another 10 companies if wave 1 is clean.
- Wave 3: invite the remaining companies only after wave 2 stays clean.
- Do not send all 20 to 30 invites at once if wave 1 reveals signup, scan, or dashboard failures.

## Beta Invite Copy Requirements

- Tell users this is a beta.
- Tell users the goal is to find visibility gaps and prioritize fixes.
- Tell users rankings and AI placement are not guaranteed.
- Tell users to sign up, add their company, run a scan, review the dashboard, and send feedback.
- Tell users where to send support requests.
- Tell users what feedback is most valuable: confusing steps, bad recommendations, missing business data, failed scans, and unclear priorities.

## Go / No-Go Decision

- Go if production health, signup, onboarding, first scan, dashboard, action center, support, and public pages are green.
- Go if beta scope is clear and does not promise postponed agency features.
- Go if a human owner is watching support and the beta tracker.
- No-go if fresh signup fails.
- No-go if onboarding cannot save.
- No-go if the first scan fails for normal websites.
- No-go if beta users can see another user's data.
- No-go if production deploy or database health is unstable.
- No-go if the site still promises standard multi-seat agency, white-label, or public API access.

## Postponed Until After First-Users Beta

- Multi-seat agency workspaces.
- Team dashboards.
- White-label portals or white-label PDF reports.
- Public self-serve API access.
- Bulk company onboarding.
- Agency client portfolio management.
- Automated done-for-you fulfillment without customer approval.
