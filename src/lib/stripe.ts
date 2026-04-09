import Stripe from "stripe";

// Only instantiate Stripe on the server side (where STRIPE_SECRET_KEY is available)
// The pricing page imports PLANS but NOT the stripe instance, so this is safe
export const stripe = typeof window === 'undefined' && process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    })
  : null as unknown as Stripe;

export const PLANS = {
  starter: {
    name: "Starter",
    price: 97,
    annualPrice: 970,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || process.env.STRIPE_PRICE_STARTER || "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID || "",
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || process.env.STRIPE_PRICE_GROWTH || "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID || "",
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_AUTHORITY_PRICE_ID || process.env.STRIPE_PRICE_AUTHORITY || "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_AUTHORITY_ANNUAL_PRICE_ID || "",
    features: [
      "Everything in Growth",
      "Full trust stack dashboard",
      "AI content engine (posts, FAQs, seasonal)",
      "Unlimited competitor tracking",
      "White-label PDF reports",
      "Dedicated onboarding call",
    ],
  },
  agency: {
    name: "Agency",
    price: 997,
    annualPrice: 9970,
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID || process.env.STRIPE_PRICE_AGENCY || "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID || "",
    features: [
      "Everything in Authority",
      "Up to 10 agent seats",
      "IMO/team dashboard",
      "API access",
      "Custom integrations",
      "Account manager",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
