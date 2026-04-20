/**
 * Server-side automation policy checker.
 * Returns the effective policy for a given action, falling back to defaults.
 */
import { createServerSupabase } from "@/lib/supabase/server";
import {
  type AutomationActionKey,
  type AutomationPolicyMode,
  DEFAULT_AUTOMATION_POLICIES,
} from "@/lib/types";

export type { AutomationActionKey, AutomationPolicyMode };

export async function getAutomationPolicy(
  userId: string,
  action: AutomationActionKey
): Promise<AutomationPolicyMode> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("user_profiles")
    .select("automation_policies")
    .eq("id", userId)
    .single();

  const policies = data?.automation_policies as Record<string, AutomationPolicyMode> | null;
  return policies?.[action] ?? DEFAULT_AUTOMATION_POLICIES[action];
}

/** Check whether an automated action is allowed without manual approval. */
export function isAutoAllowed(mode: AutomationPolicyMode): boolean {
  return mode === "auto_apply";
}

/** Check whether the action requires human approval before proceeding. */
export function isApprovalRequired(mode: AutomationPolicyMode): boolean {
  return mode === "approval_required" || mode === "manual_only";
}
