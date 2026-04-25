/**
 * Run once to create Stripe products/prices for Geothority
 * Usage: STRIPE_SECRET_KEY=sk_live_... npx ts-node scripts/setup-stripe.ts
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

async function setup() {
  console.log('Creating Geothority Stripe products...');
  const tiers = [
    { name: 'Geothority Starter', monthly: 9700, yearly: 97000, nickname: 'starter' },
    { name: 'Geothority Growth', monthly: 19700, yearly: 197000, nickname: 'growth' },
    { name: 'Geothority Authority', monthly: 29700, yearly: 297000, nickname: 'authority' },
    { name: 'Geothority Agency', monthly: 99700, yearly: 997000, nickname: 'agency' },
  ];
  for (const tier of tiers) {
    const product = await stripe.products.create({ name: tier.name });
    const monthlyPrice = await stripe.prices.create({
      product: product.id, unit_amount: tier.monthly, currency: 'usd',
      recurring: { interval: 'month' }, nickname: tier.nickname,
    });

    const yearlyPrice = await stripe.prices.create({
      product: product.id, unit_amount: tier.yearly, currency: 'usd',
      recurring: { interval: 'year' }, nickname: `${tier.nickname}_annual`,
    });

    console.log(`✅ ${tier.name}: monthly=${monthlyPrice.id} yearly=${yearlyPrice.id}`);
  }
}
setup().catch(console.error);
