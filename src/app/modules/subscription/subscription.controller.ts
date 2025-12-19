import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import {
  createCheckoutSessionHandler,
  createSubscriptionHandler,
  getAllSubscriptionsHandler,
  getSingleSubscriptionHandler,
  updateSubscriptionHandler,
  verifyCheckoutSessionHandler,
} from './subscription.service';

const createCheckoutSession = catchAsync(async (req, res) => {
  const user = req.user;
  const session = await createCheckoutSessionHandler(user.userId, req.body);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Checkout session created successfully',
    data: session,
  });
});

const verifyCheckoutSession = catchAsync(async (req, res) => {
  const user = req.user;
  const subscription = await verifyCheckoutSessionHandler(
    user.userId,
    req.body
  );
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription activated successfully',
    data: subscription,
  });
});

const createSubscription = catchAsync(async (req, res) => {
  const subscription = await createSubscriptionHandler(req.body);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Subscription created successfully',
    data: subscription,
  });
});

const updateSubscription = catchAsync(async (req, res) => {
  const subscription = await updateSubscriptionHandler(req.params.id, req.body);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription updated successfully',
    data: subscription,
  });
});

const getSingleSubscription = catchAsync(async (req, res) => {
  const subscription = await getSingleSubscriptionHandler(req.params.id);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription fetched successfully',
    data: subscription,
  });
});

const getAllSubscriptions = catchAsync(async (req, res) => {
  const subscriptions = await getAllSubscriptionsHandler(req.query);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscriptions fetched successfully',
    data: subscriptions.data,
    meta: subscriptions.meta,
  });
});

export {
  createCheckoutSession,
  createSubscription,
  updateSubscription,
  getAllSubscriptions,
  getSingleSubscription,
  verifyCheckoutSession,
};
