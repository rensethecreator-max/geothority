import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const supabase = createServiceClient();

  // Check user_profiles for plan info
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ status: "none", subscription: null });
  }

  return NextResponse.json({
    status: "ok",
    subscription: {
      plan: profile.plan ?? "free",
      stripeCustomerId: profile.stripe_customer_id ?? null,
    },
  });
}
