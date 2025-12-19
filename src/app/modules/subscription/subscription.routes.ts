import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { userRoles } from '../user/user.constant';
import {
  createCheckoutSessionValidationSchema,
  createSubscriptionValidationSchema,
  verifyCheckoutSessionValidationSchema,
  updateSubscriptionValidationSchema,
} from './subscription.validation';
import {
  createCheckoutSession,
  createSubscription,
  getAllSubscriptions,
  getSingleSubscription,
  updateSubscription,
  verifyCheckoutSession,
} from './subscription.controller';

const subscriptionRoutes = Router();

subscriptionRoutes.post(
  '/checkout',
  auth(userRoles.subscriber),
  validateRequest(createCheckoutSessionValidationSchema),
  createCheckoutSession
);

subscriptionRoutes.post(
  '/checkout/verify',
  auth(userRoles.subscriber),
  validateRequest(verifyCheckoutSessionValidationSchema),
  verifyCheckoutSession
);

subscriptionRoutes.post(
  '/',
  auth(userRoles.super_admin, userRoles.admin),
  validateRequest(createSubscriptionValidationSchema),
  createSubscription
);

subscriptionRoutes.patch(
  '/:id',
  auth(userRoles.super_admin, userRoles.admin),
  validateRequest(updateSubscriptionValidationSchema),
  updateSubscription
);

subscriptionRoutes.get(
  '/:id',
  auth(userRoles.super_admin, userRoles.admin),
  getSingleSubscription
);

subscriptionRoutes.get(
  '/',
  auth(userRoles.super_admin, userRoles.admin),
  getAllSubscriptions
);

export default subscriptionRoutes;
