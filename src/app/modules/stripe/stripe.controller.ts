import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import catchAsync from '../../utils/catchAsync';
import { getStripeClient } from '../../utils/stripeClient';
import { stripeWebhookSecret } from '../../config';
import { processStripeWebhookEvent } from '../subscription/subscription.service';
import { processIndividualPaymentWebhook } from '../individualPayment/individualPayment.service';
import Stripe from 'stripe';

const handleStripeWebhook = catchAsync(async (req, res) => {
  if (!stripeWebhookSecret) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Stripe webhook secret is not configured'
    );
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Missing Stripe signature header'
    );
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      stripeWebhookSecret
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Stripe webhook signature verification failed: ${message}`
    );
  }

  // Process subscription-related events
  await processStripeWebhookEvent(event);

  // Process individual payment events
  await processIndividualPaymentWebhook(event);

  res.status(httpStatus.OK).json({ received: true });
});

export { handleStripeWebhook };
