import Stripe from "stripe";

// Only instantiate Stripe on the server side (where STRIPE_SECRET_KEY is available)
// The pricing page imports PLANS but NOT the stripe instance, so this is safe
export const stripe = typeof window === "undefined" && process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    })
  : null;

export function isStripeConfigured() {
  return !!stripe;
}

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured. Missing STRIPE_SECRET_KEY.");
  }

  return stripe;
}

export type BillingCycle = "monthly" | "annual";

function envFirst(...keys: Array<string | undefined>) {
  for (const key of keys) {
    if (key) return key;
  }
  return "";
}

export const PLANS = {
  starter: {
    name: "Starter",
    price: 97,
    annualPrice: 970,
    priceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID, process.env.STRIPE_PRICE_STARTER),
    annualPriceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID, process.env.STRIPE_PRICE_STARTER_ANNUAL),
    features: [
      "GBP health audit",
      "Local authority score",
      "Citation inconsistency scan",
      "1 location",
      "Email support",
    ],
  },
  growth: {
    name: "Growth",
    price: 197,
    annualPrice: 1970,
    priceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID, process.env.STRIPE_PRICE_GROWTH),
    annualPriceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID, process.env.STRIPE_PRICE_GROWTH_ANNUAL),
    popular: true,
    features: [
      "Everything in Starter",
      "Weekly AI GBP posts (insurance-specific)",
      "Automated review request campaigns",
      "Competitor rank tracking (3 competitors)",
      "Citation sync across 80+ directories",
      "Priority support",
    ],
  },
  authority: {
    name: "Authority",
    price: 297,
    annualPrice: 2970,
    priceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_AUTHORITY_PRICE_ID, process.env.STRIPE_PRICE_AUTHORITY),
    annualPriceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_AUTHORITY_ANNUAL_PRICE_ID, process.env.STRIPE_PRICE_AUTHORITY_ANNUAL),
    features: [
      "Everything in Growth",
      "Full trust stack dashboard",
      "local page engine (posts, FAQs, seasonal)",
      "Unlimited competitor tracking",
      "Premium reporting exports",
      "Dedicated onboarding call",
    ],
  },
  agency: {
    name: "Agency",
    price: 997,
    annualPrice: 9970,
    priceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID, process.env.STRIPE_PRICE_AGENCY),
    annualPriceId: envFirst(process.env.NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID, process.env.STRIPE_PRICE_AGENCY_ANNUAL),
    features: [
      "Everything in Authority",
      "Private beta for larger rollouts",
      "Multi-location planning",
      "Custom reporting review",
      "Integration review",
      "Dedicated support contact",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanPriceId(plan: PlanKey, annual = false) {
  const selectedPlan = PLANS[plan];

  if (annual) {
    return selectedPlan.annualPriceId || null;
  }

  return selectedPlan.priceId || null;
}

export function getBillingCycleFromPrice(price?: Pick<Stripe.Price, "recurring"> | null): BillingCycle {
  return price?.recurring?.interval === "year" ? "annual" : "monthly";
}

export function findPlanByPriceId(priceId?: string | null): PlanKey | null {
  if (!priceId) return null;

  for (const [planKey, plan] of Object.entries(PLANS) as Array<[PlanKey, (typeof PLANS)[PlanKey]]>) {
    if (plan.priceId === priceId || plan.annualPriceId === priceId) {
      return planKey;
    }
  }

  return null;
}
