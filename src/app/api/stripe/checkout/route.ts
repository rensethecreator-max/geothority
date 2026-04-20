import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, annual } = await req.json();

    if (!plan || !PLANS[plan as PlanKey]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const selectedPlan = PLANS[plan as PlanKey];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010";

    // Use annual price ID if requested and available
    const priceId = annual && selectedPlan.annualPriceId
      ? selectedPlan.annualPriceId
      : selectedPlan.priceId;

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
          plan: plan,
        },
      },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        supabase_id: user.id,
        plan: plan,
        annual: annual ? "true" : "false",
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
