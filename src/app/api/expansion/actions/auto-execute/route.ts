import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { ExpansionManager, processAutoExecutableActions } from "@/lib/smart-expansion";

/**
 * POST /api/expansion/actions/auto-execute
 * Runs all auto-executable actions for the user's actionable targets.
 * Respects user settings (auto_exec_enabled, dry_run).
 *
 * Body (optional): { dryRun?: boolean, allowedTypes?: string[] }
 */
export async function POST(req: NextRequest) {
  const gate = await requirePlan(req, "growth");
  if (gate.error) return gate.error;

  const supabase = await createServerSupabase();
  const userId = gate.user.id;

  // Check user's auto-exec preference
  const { data: settings } = await supabase
    .from("user_settings")
    .select("auto_exec_enabled, auto_exec_dry_run")
    .eq("user_id", userId)
    .single();

  const autoExecEnabled = settings?.auto_exec_enabled ?? false;
  if (!autoExecEnabled) {
    return NextResponse.json({
      error: "Auto-execution is disabled. Enable it in Settings.",
      enabled: false,
    }, { status: 403 });
  }

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ok */ }

  const manager = new ExpansionManager(supabase);
  const targets = await manager.getActionableTargets(userId);

  const results = await processAutoExecutableActions(targets, supabase, {
    enabled: true,
    dryRun: body.dryRun ?? (settings?.auto_exec_dry_run ?? true),
    maxConcurrent: 3,
    allowedTypes: body.allowedTypes,
  });

  // Mark completed actions in progress tracker
  const successful = results.filter((r) => r.success);
  for (const result of successful) {
    // Find the action index in the target
    const target = targets.find((t) => t.id === result.targetId);
    if (!target) continue;
    const actionIndex = target.suggested_actions.findIndex(
      (a) => a.type === result.actionType && a.auto_executable
    );
    if (actionIndex >= 0 && result.result) {
      await manager.completeAction(result.targetId, actionIndex, result.result);
    }
  }

  return NextResponse.json({
    total: results.length,
    successful: successful.length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
