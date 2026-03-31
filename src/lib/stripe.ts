import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
  typescript: true,
});

export const PLANS = {
  audit: {
    name: "Audit Only",
    price: 47,
    priceId: process.env.NEXT_PUBLIC_STRIPE_AUDIT_PRICE_ID || process.env.STRIPE_PRICE_AUDIT || "",
    features: [
      "Full website scan & Trust Stack™ analysis",
      "Competitor gap report",
      "Quick Win cards with copy-paste content",
      "2 generated pages per month",
      "Email support",
    ],
  },
  starter: {
    name: "Starter",
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || process.env.STRIPE_PRICE_STARTER || "",
    popular: true,
    features: [
      "Everything in Audit",
      "Unlimited content generation",
      "Direct CMS auto-publish",
      "Competitor Watchdog (3 competitors)",
      "WordPress / Wix / Squarespace integration",
      "Priority email support",
    ],
  },
  pro: {
    name: "Pro",
    price: 299,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_PRO || "",
    features: [
      "Everything in Starter",
      "10 competitors tracked",
      "Weekly Watchdog alerts",
      "Content quality guarantee",
      "Dedicated account manager",
      "Custom reporting",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
