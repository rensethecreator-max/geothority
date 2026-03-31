/**
 * Run once to create Stripe products/prices for Geothority
 * Usage: STRIPE_SECRET_KEY=sk_live_... npx ts-node scripts/setup-stripe.ts
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

async function setup() {
  console.log('Creating Geothority Stripe products...');
  const tiers = [
    { name: 'Geothority Audit', price: 4700, nickname: 'audit' },
    { name: 'Geothority Starter', price: 14900, nickname: 'starter' },
    { name: 'Geothority Pro', price: 29900, nickname: 'pro' },
  ];
  for (const tier of tiers) {
    const product = await stripe.products.create({ name: tier.name });
    const price = await stripe.prices.create({
      product: product.id, unit_amount: tier.price, currency: 'usd',
      recurring: { interval: 'month' }, nickname: tier.nickname,
    });
    console.log(`✅ ${tier.name}: ${price.id}`);
  }
}
setup().catch(console.error);
