import Stripe from 'stripe';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { getStripeClient } from '../stripeClient';
import { TBillingCycle, TCurrency } from '../../modules/plan/plan.interface';

const getStripeOrThrow = () => {
  try {
    return getStripeClient();
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Stripe configuration is missing'
    );
  }
};

const getCustomerIdFromResource = (
  customer:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | Stripe.Subscription['customer']
) => {
  if (!customer) {
    return null;
  }

  if (typeof customer === 'string') {
    return customer;
  }

  if (typeof customer === 'object' && 'id' in customer && customer.id) {
    return customer.id as string;
  }

  return null;
};

const resolveStripeCustomerId = (
  subscription: Stripe.Subscription,
  session?: Stripe.Checkout.Session
) => {
  // First try to get customer from the session if available
  const sessionCustomerId = session
    ? getCustomerIdFromResource(session.customer)
    : null;
  if (sessionCustomerId) {
    return sessionCustomerId;
  }

  // Fallback to subscription customer
  const subscriptionCustomerId = getCustomerIdFromResource(
    subscription.customer
  );
  if (subscriptionCustomerId) {
    return subscriptionCustomerId;
  }

  // If neither is available, throw an error
  throw new AppError(
    httpStatus.BAD_REQUEST,
    'Unable to determine Stripe customer for this subscription'
  );
};

const currencyToMinorUnit = (amount: number) => Math.round(amount * 100);

const intervalMap: Record<
  TBillingCycle,
  Stripe.PriceCreateParams.Recurring.Interval
> = {
  monthly: 'month',
  yearly: 'year',
};

type CreateStripePriceForPlanInput = {
  name: string;
  amount: number;
  currency: TCurrency;
  billingCycle: TBillingCycle;
  metadata?: Record<string, string>;
};

const createStripePriceForPlan = async (
  payload: CreateStripePriceForPlanInput
) => {
  const stripe = getStripeOrThrow();

  try {
    const product = await stripe.products.create({
      name: payload.name,
      metadata: {
        ...(payload.metadata ?? {}),
        billingCycle: payload.billingCycle,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: payload.currency.toLowerCase(),
      unit_amount: currencyToMinorUnit(payload.amount),
      recurring: {
        interval: intervalMap[payload.billingCycle],
      },
    });

    return { productId: product.id, priceId: price.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to create Stripe price: ${message}`
    );
  }
};

export {
  getStripeOrThrow,
  getCustomerIdFromResource,
  resolveStripeCustomerId,
  createStripePriceForPlan,
};
