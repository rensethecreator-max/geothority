import { NextRequest, NextResponse } from "next/server";
import { createOptionalServiceClient } from "@/lib/supabase/server";
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

  if (!process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET_PREVIOUS) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
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

  const supabase = createOptionalServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Billing service is temporarily unavailable" }, { status: 503 });
  }

  try {
    switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const supabaseId = session.metadata?.supabase_id;

      if (!supabaseId) {
        throw new Error("Checkout session is missing its account identifier");
      }
      {
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
            } catch (error) {
            console.error("Stripe subscription lookup failed; asking Stripe to retry", error);
            throw error;
          }
        }

        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert({
            id: supabaseId,
            ...(resolvedPlan ? { plan: resolvedPlan } : {}),
            ...(customerId ? { stripe_customer_id: customerId } : {}),
            billing_cycle: billingCycle,
            subscription_status: subscriptionStatus ?? (trialEndsAt ? "trialing" : "active"),
            trial_ends_at: trialEndsAt,
          }, { onConflict: "id" });
        if (profileError) throw new Error(`Unable to save subscription entitlement: ${profileError.message}`);

        const { error: analyticsError } = await supabase.from("analytics_events").insert({
          user_id: supabaseId,
          event_name: "subscription_started",
          metadata: {
            plan: resolvedPlan,
            billingCycle,
            stripeCustomerId: customerId,
            subscriptionId,
            status: subscriptionStatus,
            stripeEventId: event.id,
          },
          session_id: "server-stripe-webhook",
        });
        if (analyticsError) console.error("Stripe analytics event could not be saved", analyticsError);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription.customer);

      if (!customerId) break;

      const { data: profile, error: lookupError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (lookupError) throw new Error(`Unable to find subscription owner: ${lookupError.message}`);
      if (!profile) throw new Error("Subscription owner is not linked yet; retrying webhook");

      {
        const status = subscription.status;
        const primaryPrice = subscription.items.data[0]?.price;
        const resolvedPlan = subscription.metadata?.plan || findPlanByPriceId(primaryPrice?.id ?? null);
        const billingCycle = getBillingCycleFromPrice(primaryPrice);

        if (status === "trialing") {
          await persistProfileUpdate(supabase.from("user_profiles")
            .update({
              ...(resolvedPlan ? { plan: resolvedPlan } : {}),
              billing_cycle: billingCycle,
              subscription_status: "trialing",
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq("id", profile.id));
        } else if (status === "active") {
          await persistProfileUpdate(supabase.from("user_profiles")
            .update({
              ...(resolvedPlan ? { plan: resolvedPlan } : {}),
              billing_cycle: billingCycle,
              subscription_status: "active",
              trial_ends_at: null,
            })
            .eq("id", profile.id));
        } else if (status === "canceled" || status === "unpaid" || status === "past_due") {
          await persistProfileUpdate(supabase.from("user_profiles")
            .update({ plan: "free", billing_cycle: billingCycle, subscription_status: status })
            .eq("id", profile.id));
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription.customer);

      if (!customerId) break;

      const { data: profile, error: lookupError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (lookupError) throw new Error(`Unable to find subscription owner: ${lookupError.message}`);
      if (!profile) throw new Error("Subscription owner is not linked yet; retrying webhook");

      {
        await persistProfileUpdate(supabase.from("user_profiles")
          .update({
            plan: "free",
            billing_cycle: getBillingCycleFromPrice(subscription.items.data[0]?.price),
            subscription_status: "canceled",
            trial_ends_at: null,
          })
          .eq("id", profile.id));
      }
      break;
    }

    case "customer.subscription.trial_will_end": {
      // Send reminder email 3 days before trial ends
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription.customer);

      if (!customerId) break;

      const { data: profile, error: lookupError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (lookupError) throw new Error(`Unable to find trial owner: ${lookupError.message}`);

      // Could send a trial-ending email here via Resend
      console.log(`[stripe-webhook] Trial ending soon for user ${profile?.id}`);
      break;
    }
  }
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed; Stripe should retry" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function persistProfileUpdate(query: any) {
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(`Unable to update subscription entitlement: ${error.message}`);
  if (!data) throw new Error("No subscription owner matched the update");
}
