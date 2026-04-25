import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { PLANS, type PlanKey } from "@/lib/stripe";

/**
 * Verify Stripe webhook signature, supporting secret rotation.
 * Tries STRIPE_WEBHOOK_SECRET first, then STRIPE_WEBHOOK_SECRET_PREVIOUS.
 * This allows zero-downtime rotation: set PREVIOUS to the old secret,
 * update STRIPE_WEBHOOK_SECRET to the new one, then remove PREVIOUS.
 */
function verifyWebhookSignature(body: string, sig: string): Stripe.Event | null {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_PREVIOUS,
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, sig, secret);
    } catch {
      // Try next secret
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  const event = verifyWebhookSignature(body, sig);
  if (!event) {
    console.error("Webhook signature verification failed: no matching secret");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const supabaseId = session.metadata?.supabase_id;
      const plan = session.metadata?.plan;

      if (supabaseId && plan) {
        // Determine if this was an annual subscription
        const isAnnual = session.metadata?.annual === "true";

        await supabase
          .from("user_profiles")
          .upsert({
            id: supabaseId,
            plan,
            stripe_customer_id: session.customer as string,
            billing_cycle: isAnnual ? "annual" : "monthly",
          });

        // If trial, set trial_end date
        const subscriptionId = session.subscription as string;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            if (subscription.trial_end) {
              await supabase
                .from("user_profiles")
                .update({
                  trial_ends_at: new Date(subscription.trial_end * 1000).toISOString(),
                })
                .eq("id", supabaseId);
            }
          } catch {
            // Subscription lookup failed — non-critical
          }
        }
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

        // Handle trial -> active transition
        if (status === "trialing") {
          // Keep the plan but mark as trialing
          await supabase
            .from("user_profiles")
            .update({
              subscription_status: "trialing",
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq("id", profile.id);
        } else if (status === "active") {
          await supabase
            .from("user_profiles")
            .update({
              subscription_status: "active",
              trial_ends_at: null,
            })
            .eq("id", profile.id);
        } else if (status === "canceled" || status === "unpaid" || status === "past_due") {
          await supabase
            .from("user_profiles")
            .update({ plan: "free", subscription_status: status })
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
          .update({
            plan: "free",
            subscription_status: "canceled",
            trial_ends_at: null,
          })
          .eq("id", profile.id);
      }
      break;
    }

    case "customer.subscription.trial_will_end": {
      // Send reminder email 3 days before trial ends
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, email")
        .eq("stripe_customer_id", customerId)
        .single();

      // Could send a trial-ending email here via Resend
      console.log(`[stripe-webhook] Trial ending soon for user ${profile?.id}`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
