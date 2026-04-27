import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStripe } from "@/lib/stripe";

function getSafeReturnPath(returnPath?: string) {
  return returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")
    ? returnPath
    : "/settings";
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { returnPath } = await req.json().catch(() => ({}));
  const safeReturnPath = getSafeReturnPath(returnPath);
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || "https://geothority.io";
  const portalReturnUrl = process.env.STRIPE_PORTAL_RETURN_URL ?? `${appUrl}${safeReturnPath}`;

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found. Complete checkout first." },
      { status: 404 }
    );
  }

  try {
    const stripe = requireStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: portalReturnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[billing] create-portal-session error:", err);
    return NextResponse.json({ error: "Failed to create portal session", details: err?.message }, { status: 500 });
  }
}
