/**
 * plan-gate.ts
 * API-level plan gating helper for Geothority.
 *
 * Plan hierarchy (ascending):
 *   free < starter < growth < authority < agency
 *
 * Usage:
 *   import { requirePlan } from "@/lib/plan-gate";
 *
 *   const gate = await requirePlan(request, "growth");
 *   if (gate.error) return gate.error;   // NextResponse with 403
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export type PlanTier = "free" | "audit" | "starter" | "growth" | "authority" | "agency" | "pro";

/** Ascending tier order. 'pro' is legacy — treated same as 'starter'. */
const TIER_ORDER: PlanTier[] = ["free", "audit", "starter", "growth", "authority", "agency"];

// 'pro' was a legacy paid plan; treat as 'starter' for gating purposes
const TIER_ALIASES: Partial<Record<PlanTier, PlanTier>> = {
  pro: "starter",
};

function tierIndex(plan: PlanTier): number {
  const resolved = TIER_ALIASES[plan] ?? plan;
  const idx = TIER_ORDER.indexOf(resolved);
  return idx === -1 ? 0 : idx;
}

export function planMeetsMin(userPlan: PlanTier, minPlan: PlanTier): boolean {
  return tierIndex(userPlan) >= tierIndex(minPlan);
}

/** Returns `{ user, plan }` if authorized, or `{ error: NextResponse }` if not. */
export async function requirePlan(
  request: NextRequest,
  minPlan: PlanTier
): Promise<
  | { error: NextResponse; user?: undefined; plan?: undefined }
  | { error?: undefined; user: { id: string; email?: string }; plan: PlanTier }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const userPlan = (profile?.plan as PlanTier) ?? "free";

  if (!planMeetsMin(userPlan, minPlan)) {
    const planDisplayNames: Record<PlanTier, string> = {
      free: "Free",
      audit: "Audit",
      starter: "Starter",
      growth: "Growth",
      authority: "Authority",
      agency: "Agency",
      pro: "Pro",
    };
    return {
      error: NextResponse.json(
        {
          error: "Plan upgrade required",
          currentPlan: userPlan,
          requiredPlan: minPlan,
          message: `This feature requires the ${planDisplayNames[minPlan]} plan or higher. You are on the ${planDisplayNames[userPlan]} plan.`,
          upgradeUrl: "/billing",
        },
        { status: 403 }
      ),
    };
  }

  return { user, plan: userPlan };
}
