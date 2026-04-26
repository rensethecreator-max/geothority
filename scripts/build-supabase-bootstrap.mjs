import fs from 'fs';
import path from 'path';

const root = process.cwd();
const ordered = [
  'supabase/migration.sql',
  'supabase/migrations/20260406_gbp_tables.sql',
  'supabase/migrations/20260412_gbp_monitor_score_history.sql',
  'supabase/migrations/20260412_saas_package.sql',
  'supabase/migrations/20260413_listing_sync.sql',
  'supabase/migrations/fix_packages.sql',
  'supabase/migrations/20260415_fix_plan_schema.sql',
  'supabase/migrations/20260417_competitor_identity_hardening.sql',
  'supabase/migrations/20260417_competitor_snapshots.sql',
  'supabase/migrations/20260417_competitor_profile_attributes.sql',
  'supabase/migrations/20260417_scheduled_tasks.sql',
  'supabase/migrations/20260418_keyword_research.sql',
  'supabase/migrations/20260419_automation_policies.sql',
  'supabase/migrations/20260419_fix_execution_plans.sql',
  'supabase/migrations/20260419_fix_execution_plan_verification.sql',
  'supabase/migrations/20260419_smart_expansion.sql',
  'supabase/migrations/20260420_billing_trial.sql',
  'supabase/migrations/20260420_citation_truth_gbp_posts.sql',
  'supabase/migrations/20260420_gbp_auth_ai_visibility.sql',
  'supabase/migrations/20260420_phases_5_through_8.sql',
];

const missing = ordered.filter(f => !fs.existsSync(path.join(root, f)));
if (missing.length) {
  console.error('Missing files:', missing);
  process.exit(1);
}

const out = [];
out.push('-- Geothority fresh-project bootstrap for a dedicated Supabase project');
out.push('-- Generated on 2026-04-26 to migrate only Geothority schema');
out.push('-- Ordered to satisfy table dependencies for a clean project bootstrap');
out.push('create extension if not exists pgcrypto;');
out.push('');
for (const rel of ordered) {
  const base = path.basename(rel);
  out.push('');
  out.push('-- ==================================================================');
  out.push(`-- BEGIN ${base}`);
  out.push('-- ==================================================================');
  out.push(fs.readFileSync(path.join(root, rel), 'utf8').trimEnd());
  out.push('');
  out.push('-- ==================================================================');
  out.push(`-- END ${base}`);
  out.push('-- ==================================================================');
  out.push('');
}
fs.writeFileSync(path.join(root, 'supabase/GEOTHORITY_FRESH_PROJECT_BOOTSTRAP.sql'), out.join('\n'));
console.log('Wrote supabase/GEOTHORITY_FRESH_PROJECT_BOOTSTRAP.sql');
