import Stripe from 'stripe';
import { stripeSecretKey } from '../config';

let stripeClient: Stripe | null = null;

const getStripeClient = (): Stripe => {
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  return stripeClient;
};

export { getStripeClient };
