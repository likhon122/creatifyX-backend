import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  createCheckoutSession,
  verifyCheckoutSession,
  getPaymentHistory,
  checkAssetPurchase,
} from './individualPayment.controller';
import {
  createPaymentValidationSchema,
  verifyCheckoutSessionValidationSchema,
  getPaymentHistoryValidationSchema,
} from './individualPayment.validation';

const individualPaymentRoutes = Router();

// Create checkout session for asset purchase
individualPaymentRoutes.post(
  '/create-checkout-session',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(createPaymentValidationSchema),
  createCheckoutSession
);

// Verify checkout session after Stripe redirects
individualPaymentRoutes.post(
  '/verify-session',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(verifyCheckoutSessionValidationSchema),
  verifyCheckoutSession
);

// Get payment history for logged-in user
individualPaymentRoutes.get(
  '/payment-history',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(getPaymentHistoryValidationSchema),
  getPaymentHistory
);

// Check if user has purchased a specific asset
individualPaymentRoutes.get(
  '/check/:assetId',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  checkAssetPurchase
);

export default individualPaymentRoutes;
