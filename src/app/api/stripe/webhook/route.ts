import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const supabaseId = session.metadata?.supabase_id;
      const plan = session.metadata?.plan;

      if (supabaseId && plan) {
        await supabase
          .from("user_profiles")
          .upsert({
            id: supabaseId,
            plan,
            stripe_customer_id: session.customer as string,
          });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        const status = subscription.status;
        if (status === "active") {
          // Keep current plan
        } else if (status === "canceled" || status === "unpaid") {
          await supabase
            .from("user_profiles")
            .update({ plan: "free" })
            .eq("id", profile.id);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabase
          .from("user_profiles")
          .update({ plan: "free" })
          .eq("id", profile.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
