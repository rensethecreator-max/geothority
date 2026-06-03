# Geothority Beta Launch Plan

Target: launch a controlled working beta tomorrow with 20 to 30 separate company accounts.

## Beta Scope

- Support one company per signup account.
- Invite 20 to 30 companies as a controlled beta cohort.
- Allow each company to complete signup, onboarding, a scan, dashboard review, action-center review, and support follow-up.
- Postpone multi-seat agency workflows, team dashboards, white-label reporting, public API access, and bulk multi-company management.
- Treat larger operators as a private rollout handled manually by Geothority support.

## What Beta Users Can Expect

- A free scan or beta plan access that shows where their business is weak across website, local visibility, reputation, listings, and AI discovery signals.
- A dashboard that summarizes their current visibility posture and next actions.
- Prioritized action cards that explain what to fix first and why it matters.
- Content and recommendation workflows where enabled by their plan.
- Google Business Profile connection and monitoring where the customer completes OAuth and data is available.
- Reports and visibility tracking that help prove progress over time.
- Support through the published support channel while the beta is active.

## What Beta Users Should Not Expect Yet

- Guaranteed first-page Google rankings.
- Guaranteed AI answer placement.
- Fully automated SEO execution without customer review or approvals.
- Multi-seat agency workspaces.
- Bulk company onboarding.
- White-label client portals.
- Public self-serve API access.
- Fully mature enterprise reporting.

## Must Be Green Before Invites Go Out

- Production deploy succeeds from source upload.
- `npm run build` succeeds locally.
- `npm run proof:readiness -- --base-url=https://geothority.io` passes.
- `npm run ops:deployment-truth` passes for `geothority.io` and `www.geothority.io`.
- Live signup works for a fresh user.
- Live onboarding works for a fresh user.
- Live scan works and creates a valid scan detail page.
- Live dashboard, action center, content, reports, billing, reputation, competitors, AI overview, and AI visibility routes load without 500s or raw schema errors.
- Public pages load cleanly: home, pricing, service facts, FAQ, contact, comparison, insurance agents, privacy, and terms.
- The public copy matches beta scope and does not promise agency features to standard beta users.

## Operating Checklist For 20 To 30 Companies

- Create a beta tracker with company name, owner, email, website, signup status, scan status, plan/access level, support status, and notes.
- Decide whether beta accounts are free, trialed, or manually upgraded.
- For beta accounts that need paid-plan features, manually set the correct plan or run the tested checkout path.
- Send a short onboarding note that explains the beta scope, expected outcomes, and what feedback to provide.
- Monitor errors daily, support messages, and failed scans during the first 24 hours after invites are sent.
- Review the beta tracker daily and daily after the first cohort to catch stuck accounts.
- Keep a daily summary of what broke, what confused users, and what should be fixed before wider launch.

## Launch Decision

- Green for tomorrow beta if the beta stays controlled, one company per account, and support is actively monitored.
- Not green for a broad public agency launch until multi-seat, agency dashboards, white-label reporting, public API access, and bulk company management are intentionally finished and tested.
