import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPlanPriceId, requireStripe, PLANS, type PlanKey } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json().catch(() => null);
    const plan = payload?.plan;
    const annual = payload?.annual === true;

    if (!plan || !PLANS[plan as PlanKey]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const selectedPlanKey = plan as PlanKey;
    const selectedPlan = PLANS[selectedPlanKey];
    const stripe = requireStripe();
    const appUrl = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

    if (annual && !selectedPlan.annualPriceId) {
      return NextResponse.json(
        { error: "Annual billing is not configured for this plan yet." },
        { status: 400 }
      );
    }

    const priceId = getPlanPriceId(selectedPlanKey, annual);

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured for this plan" }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("user_profiles")
        .upsert({ id: user.id, stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // 14-day free trial — no charge until trial ends
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_id: user.id,
          plan,
          billing_cycle: annual ? "annual" : "monthly",
        },
      },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        supabase_id: user.id,
        plan,
        annual: annual ? "true" : "false",
        billing_cycle: annual ? "annual" : "monthly",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
