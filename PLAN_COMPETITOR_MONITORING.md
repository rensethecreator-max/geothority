# Plan: Geothority Automated Competitor Monitoring

## Goal
Implement automated competitor monitoring and notification system to provide users with proactive insights into market shifts.

## Phase 1: Scheduled Rescans

### Task 1: Create Supabase Cron Job/Table for Scheduled Rescans
- **Description:** Set up a mechanism to trigger competitor rescans automatically on a schedule (e.g., daily or weekly).
- **Details:**
    - Create a `scheduled_tasks` table in Supabase to manage recurring jobs.
    - Define a schema for competitor rescans: `task_id`, `user_id`, `competitor_id` (nullable, if scanning all for user), `status` (pending, running, completed, failed), `scheduled_at`, `executed_at`.
    - Implement a Supabase Cron Job or use PostgreSQL triggers to periodically check `scheduled_tasks` and trigger rescans.
- **Acceptance Criteria:** Rescans can be scheduled and executed automatically for a user's competitor set.

### Task 2: Modify Competitor API to support scheduled rescans
- **Description:** Update the `/api/competitors/route.ts` handler to accept and process rescans triggered by the cron job.
- **Details:**
    - Add logic to handle scheduled rescans, potentially bypassing some user-facing checks (like plan gating if cron is run server-side with elevated privileges).
    - Ensure the `refresh=true` parameter logic is robust for automated triggers.
- **Acceptance Criteria:** API can be called programmatically to perform rescans.

## Phase 2: Change Detection and Notifications

### Task 3: Enhance Snapshot Analysis for Change Detection
- **Description:** Refine the logic that compares historical snapshots to identify meaningful changes.
- **Details:**
    - Analyze existing `competitor_snapshots` and the comparison logic in `/api/competitors/route.ts`.
    - Develop clear thresholds for what constitutes a "significant" change (e.g., rating drop of >0.3, review count increase of >10, score change of >5).
    - Ensure alerts are generated based on these thresholds.
- **Acceptance Criteria:** Meaningful changes between snapshots are accurately detected and categorized.

### Task 4: Implement Notification Generation for Competitor Changes
- **Description:** Create a system to generate notifications when significant competitor changes are detected.
- **Details:**
    - Integrate with the existing notification system (`/api/notifications` and `notifications` table).
    - When a significant change is detected during a scan, create a new notification for the user.
    - Notification content should clearly state the change, its severity, and the competitor involved.
    - Ensure notifications are only generated for new, significant changes to avoid spamming users.
- **Acceptance Criteria:** Users receive relevant notifications about competitor performance shifts.

### Task 5: Update Competitor Page UI to display new alerts effectively
- **Description:** Enhance the `/app/(app)/competitors/page.tsx` component to prominently display the new, change-based alerts.
- **Details:**
    - Highlight alerts with severity-based styling.
    - Potentially create a dedicated "Signals" or "Alerts" section.
    - Ensure alerts are easily understandable and actionable.
- **Acceptance Criteria:** Users can clearly see and understand the latest competitor change alerts.

## Phase 3: Refinement and Automation

### Task 6: Introduce Weekly Summaries
- **Description:** Generate automated weekly summaries of competitor market trends.
- **Details:**
    - Aggregate detected changes and insights over a week.
    - Create a digest email or in-app summary.
- **Acceptance Criteria:** Users receive concise weekly summaries of market activity.

### Task 7: Explore Autonomous Countermoves
- **Description:** Begin planning for proactive responses to competitor actions (e.g., suggesting content, reviews, or GBP posts).
- **Details:** This is a longer-term goal, starting with simple recommendations based on detected patterns.
- **Acceptance Criteria:** A clear product strategy and initial technical approach for automated countermoves are defined.