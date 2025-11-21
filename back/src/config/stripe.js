const Stripe = require('stripe');
const STRIPE_KEY = process.env.SKSTRIPE;
if (!STRIPE_KEY) console.warn('Falta SKSTRIPE en .env');
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });

async function createPaymentIntent(amount, metadata = {}) {
  const cents = Math.round(Number(amount) * 100);
  return stripe.paymentIntents.create({
    amount: cents,
    currency: 'pen',
    automatic_payment_methods: { enabled: true },
    metadata
  });
}
async function retrievePaymentIntent(id) {
  return stripe.paymentIntents.retrieve(id);
}
module.exports = { stripe, createPaymentIntent, retrievePaymentIntent };