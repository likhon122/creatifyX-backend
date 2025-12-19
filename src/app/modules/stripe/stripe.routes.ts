import express, { Router } from 'express';
import { handleStripeWebhook } from './stripe.controller';

const stripeRoutes = Router();

stripeRoutes.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default stripeRoutes;
