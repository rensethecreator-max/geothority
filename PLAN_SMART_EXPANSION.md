# Phase 7: Smart Expansion Layer — Enhanced

## What Was Built

The Smart Expansion Layer enables Geothority to autonomously identify high-impact cities, services, and niche directories for a business to expand into, with impact scoring, priority matrices, AI-generated rationale, and auto-execution capabilities.

### Architecture

```
lib/smart-expansion/
  ├── types.ts              — Data models, signal types, config constants
  ├── expansion-engine.ts   — Core AI scoring logic + live Census geocoding
  ├── expansion-manager.ts  — Persistence layer (Supabase + memory), lifecycle, dashboard
  ├── ai-rationale.ts       — LLM-powered strategic rationale generation (GPT-4o-mini)
  ├── auto-exec.ts          — Auto-execution engine for auto_executable actions
  └── index.ts              — Public API re-exports

app/api/expansion/
  ├── recommendations/route.ts      — POST: generate fresh recommendations (with AI rationale)
  ├── targets/route.ts              — GET/PATCH/DELETE: CRUD for expansion targets
  ├── dashboard/route.ts            — GET: expansion dashboard summary
  ├── actions/complete/route.ts     — POST: mark suggested actions as completed
  └── actions/auto-execute/route.ts — POST: auto-execute eligible actions

app/api/cron/expansion-refresh/route.ts — Cron: re-score all active targets weekly (Mondays 3am)

app/(app)/expansion/page.tsx — Full UI page with dashboard, tabs, target cards, action tracking
```

### Core Logic

1. **Signal-Based Scoring**: Each expansion target gets an impact score (0-100) computed from 10 weighted signals:
   - Search volume (20%), competitor gap (18%), proximity (15%), service demand (15%), population density (10%), directory authority (8%), review density gap (7%), SERP feature opportunity (4%), AI citation gap (3%), seasonal trend (0% — placeholder)

2. **Three Target Types**:
   - **Cities**: Nearby cities via Census Geocoding API (with heuristic fallback), scored by population, proximity, and competitor weakness
   - **Services**: Adjacent service offerings (expanded industry database covering 9+ industries), scored by search volume and competitor gaps
   - **Niche Directories**: Industry-specific directories (11 common + 9 industry niche maps), scored by domain authority and competitor listing rates

3. **Priority Matrix**: Impact vs. effort quadrant classification (quick wins, major projects, fill-ins, deprioritize)

4. **AI-Powered Rationale**: Top targets get GPT-4o-mini-generated strategic rationale with signal context, competitor gaps, and actionable language. Falls back to template-based rationale if API unavailable.

5. **Auto-Execution Engine**: Processes `auto_executable: true` actions in bulk:
   - Creates draft city pages, service pages, schema markup, and citation tasks in `generated_content`
   - Respects user opt-in setting (`auto_exec_enabled`) and dry-run mode
   - Max concurrent execution limit for safety
   - Configurable allowed action types

6. **Suggested Actions**: Each target comes with concrete next steps with effort levels and auto-executable flags

7. **Lifecycle**: identified → researching → ready → in_progress → completed (or deprioritized)

### Integration Points

- **Sidebar**: "Smart Expansion" entry added between competitors and keyword research
- **Plan Gate**: Requires "growth" plan (same as competitors/citations)
- **Supabase**: Uses `expansion_targets` and `expansion_progress` tables with RLS
- **Content System**: Reads existing city/service pages from `generated_content`; auto-exec writes drafts back
- **Competitor Data**: Pulls active competitor domains to enrich gap analysis
- **Census API**: Live geocoding + nearby cities via Census Geocoding API with heuristic fallback
- **OpenAI**: GPT-4o-mini for AI rationale generation
- **Scheduler job**: Weekly re-scoring on Mondays at 3am UTC (`/api/cron/expansion-refresh`)

### Migration SQL

Run the `MIGRATION_SQL` export from `expansion-manager.ts` to create the required tables:
- `expansion_targets` — stores all identified targets with signals, actions, and scoring
- `expansion_progress` — tracks action completion and measurable results

Optional: Add `user_settings` columns for `auto_exec_enabled` (boolean) and `auto_exec_dry_run` (boolean).

### Remaining Production TODO

- Wire `searchVolumeData` from the existing keyword research module for data-driven service scoring
- Add seasonal trend signal data source (currently 0% weight)
- Add review density gap signal from GBP monitoring data
- Add SERP feature opportunity signal from live SERP analysis
- Add AI citation gap signal from AI answer monitoring
- Add auto-exec for `create_gbp_post` and `optimize_gbp_category` action types (requires GBP API)
- Consider batched AI rationale generation for cost optimization
