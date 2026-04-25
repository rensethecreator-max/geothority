import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

/**
 * Admin-only billing overview.
 * GET /api/admin/billing — list subscription stats + recent customers
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminUser(req);
  if ("error" in auth) return auth.error;
  // auth.user is admin-verified at this point

  const supabase = createServiceClient();

  // Count users by plan
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("plan, stripe_customer_id, subscription_status, trial_ends_at");

  const planCounts: Record<string, number> = {};
  let withStripe = 0;
  let trialActive = 0;

  for (const p of profiles ?? []) {
    const plan = p.plan ?? "free";
    planCounts[plan] = (planCounts[plan] ?? 0) + 1;
    if (p.stripe_customer_id) withStripe++;
    if (p.trial_ends_at && new Date(p.trial_ends_at) > new Date()) trialActive++;
  }

  return NextResponse.json({
    planCounts,
    totalUsers: profiles?.length ?? 0,
    withStripeCustomer: withStripe,
    trialActive,
  });
}
