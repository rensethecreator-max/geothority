import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { findPlanByPriceId, getBillingCycleFromPrice, requireStripe } from "@/lib/stripe";

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

  const stripe = requireStripe();

  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, sig, secret);
    } catch {
      // Try next secret
    }
  }
  return null;
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  return typeof customer === "string" ? customer : customer?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  try {
    requireStripe();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Stripe is not configured" }, { status: 503 });
  }

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

      if (supabaseId) {
        const customerId = getCustomerId(session.customer);
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        let resolvedPlan = session.metadata?.plan ?? null;
        let billingCycle = session.metadata?.billing_cycle === "annual" ? "annual" : "monthly";
        let subscriptionStatus = session.payment_status === "paid" ? "active" : null;
        let trialEndsAt: string | null = null;

        if (subscriptionId) {
          try {
            const stripe = requireStripe();
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ["items.data.price"],
            });
            const primaryPrice = subscription.items.data[0]?.price;

            resolvedPlan = resolvedPlan ?? findPlanByPriceId(primaryPrice?.id ?? null);
            billingCycle = getBillingCycleFromPrice(primaryPrice);
            subscriptionStatus = subscription.status;
            trialEndsAt = subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null;
          } catch {
            // Subscription lookup failed — non-critical
          }
        }

        await supabase
          .from("user_profiles")
          .upsert({
            id: supabaseId,
            ...(resolvedPlan ? { plan: resolvedPlan } : {}),
            ...(customerId ? { stripe_customer_id: customerId } : {}),
            billing_cycle: billingCycle,
            subscription_status: subscriptionStatus ?? (trialEndsAt ? "trialing" : "active"),
            trial_ends_at: trialEndsAt,
          });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription.customer);

      if (!customerId) break;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        const status = subscription.status;
        const primaryPrice = subscription.items.data[0]?.price;
        const resolvedPlan = subscription.metadata?.plan || findPlanByPriceId(primaryPrice?.id ?? null);
        const billingCycle = getBillingCycleFromPrice(primaryPrice);

        if (status === "trialing") {
          await supabase
            .from("user_profiles")
            .update({
              ...(resolvedPlan ? { plan: resolvedPlan } : {}),
              billing_cycle: billingCycle,
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
              ...(resolvedPlan ? { plan: resolvedPlan } : {}),
              billing_cycle: billingCycle,
              subscription_status: "active",
              trial_ends_at: null,
            })
            .eq("id", profile.id);
        } else if (status === "canceled" || status === "unpaid" || status === "past_due") {
          await supabase
            .from("user_profiles")
            .update({ plan: "free", billing_cycle: billingCycle, subscription_status: status })
            .eq("id", profile.id);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription.customer);

      if (!customerId) break;

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
            billing_cycle: getBillingCycleFromPrice(subscription.items.data[0]?.price),
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
      const customerId = getCustomerId(subscription.customer);

      if (!customerId) break;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      // Could send a trial-ending email here via Resend
      console.log(`[stripe-webhook] Trial ending soon for user ${profile?.id}`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
