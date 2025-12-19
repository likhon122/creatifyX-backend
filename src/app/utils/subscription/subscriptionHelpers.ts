import { Types } from 'mongoose';
import Stripe from 'stripe';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { Subscription } from '../../modules/subscription/subscription.model';
import Plan from '../../modules/plan/plan.model';
import { User } from '../../modules/user/user.model';
import { Organization } from '../../modules/organization/organization.model';
import { subscriptionStatus } from '../../modules/subscription/subscription.constant';
import { TSubscriptionStatus } from '../../modules/subscription/subscription.interface';
import {
  getStripeOrThrow,
  resolveStripeCustomerId,
} from '../stripe/stripeHelpers';
import {
  sendSubscriptionInvoiceEmail,
  SubscriptionForInvoice,
} from '../email/subscriptionInvoice';
import { EarningService } from '../../modules/dashboard/earning.service';

const findPlanByIdOrThrow = async (planId: string) => {
  const plan = await Plan.findById(planId);
  if (!plan) {
    throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');
  }
  return plan;
};

const findUserByIdOrThrow = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const unixToDate = (timestamp?: number | null) => {
  if (!timestamp) {
    return new Date();
  }
  return new Date(timestamp * 1000);
};

const mapStripeSubscriptionStatus = (
  status: Stripe.Subscription.Status
): TSubscriptionStatus => {
  switch (status) {
    case 'canceled':
      return subscriptionStatus.canceled;
    case 'unpaid':
    case 'incomplete_expired':
      return subscriptionStatus.expired;
    default:
      return subscriptionStatus.active;
  }
};

const resolveUserAndPlanForStripeSubscription = async (
  subscription: Stripe.Subscription
) => {
  // Extract userId and planId from Stripe subscription metadata
  const metadata = subscription.metadata ?? {};
  const metadataUserId = metadata.userId;
  const metadataPlanId = metadata.planId;

  // If both userId and planId are present in metadata and valid, return them
  if (
    metadataUserId &&
    metadataPlanId &&
    Types.ObjectId.isValid(metadataUserId) &&
    Types.ObjectId.isValid(metadataPlanId)
  ) {
    return {
      userId: metadataUserId,
      planId: metadataPlanId,
    };
  }

  // If metadata is missing or invalid, check existing subscription in DB
  const existing = await Subscription.findOne({
    stripeSubscriptionId: subscription.id,
  }).select('user plan');

  if (existing?.user && existing?.plan) {
    return {
      userId: (existing.user as Types.ObjectId).toString(),
      planId: (existing.plan as Types.ObjectId).toString(),
    };
  }

  // If neither metadata nor existing subscription is valid, throw an error
  throw new AppError(
    httpStatus.BAD_REQUEST,
    'Unable to resolve subscription owner from Stripe metadata'
  );
};

const updateUserPremiumFlag = async (
  userId: string,
  status: TSubscriptionStatus
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const shouldBePremium = status === subscriptionStatus.active;
  if (user.isPremium !== shouldBePremium) {
    user.isPremium = shouldBePremium;
    await user.save();
  }
};

const ensurePlanExists = async (planId: string) => {
  const exists = await Plan.exists({ _id: planId });
  if (!exists) {
    throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');
  }
};

const ensureUserExists = async (userId: string) => {
  const exists = await User.exists({ _id: userId });
  if (!exists) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
};

const ensureOrganizationExists = async (organizationId: string) => {
  const exists = await Organization.exists({ _id: organizationId });
  if (!exists) {
    throw new AppError(httpStatus.NOT_FOUND, 'Organization not found');
  }
};

const ensurePeriodRangeIsValid = (start?: Date, end?: Date) => {
  if (start && end && end.getTime() < start.getTime()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Current period end must be after current period start'
    );
  }
};

const ensureUserSubscriptionLimit = async (
  userId: string,
  excludeId?: Types.ObjectId
) => {
  const filter: Record<string, unknown> = { user: userId };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existing = await Subscription.findOne(filter).select('_id');
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'User already has an active subscription'
    );
  }
};

const populateSubscription = async (subscriptionId: Types.ObjectId) => {
  const subscription = await Subscription.findById(subscriptionId)
    .populate('plan')
    .populate({
      path: 'user',
      select:
        'name email role profileImage status authorVerificationStatus organization orgRole',
    })
    .populate({
      path: 'organization',
      select: 'name owner members',
    });

  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  return subscription;
};

type SyncSubscriptionFromStripeInput = {
  userId: string;
  planId: string;
  stripeSubscription: Stripe.Subscription;
  stripeCustomerId: string;
};

const syncSubscriptionFromStripe = async (
  payload: SyncSubscriptionFromStripeInput
) => {
  const { userId, planId, stripeSubscription, stripeCustomerId } = payload;

  // Confirm plan and user exist
  await ensurePlanExists(planId);
  const user = await findUserByIdOrThrow(userId);

  // Prepare subscription data and normalized status
  const normalizedStatus = mapStripeSubscriptionStatus(
    stripeSubscription.status
  );
  const subscriptionData = {
    plan: new Types.ObjectId(planId),
    user: user._id,
    status: normalizedStatus,
    stripeCustomerId,
    stripeSubscriptionId: stripeSubscription.id,
    currentPeriodStart: unixToDate(stripeSubscription.current_period_start),
    currentPeriodEnd: unixToDate(stripeSubscription.current_period_end),
    cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
  };

  // Check for existing subscription by Stripe subscription ID or user ID
  const existingByStripeId = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id,
  });

  // Make a variable to hold the subscription record
  let subscription = existingByStripeId;
  let isNewlyCreated = false;

  // If not found by Stripe ID, check by user ID
  if (!subscription) {
    subscription = await Subscription.findOne({ user: user._id });
  }

  // Create or update subscription record
  if (subscription) {
    subscription.set(subscriptionData);
    await subscription.save();
  } else {
    subscription = await Subscription.create(subscriptionData);
    isNewlyCreated = true;
  }

  // Update user's premium flag based on subscription status
  await updateUserPremiumFlag(userId, normalizedStatus);

  // Track subscription revenue for dashboard analytics
  if (isNewlyCreated || normalizedStatus === 'active') {
    const plan = await Plan.findById(planId);
    if (plan) {
      await EarningService.createSubscriptionRevenueRecord({
        subscriptionId: subscription._id.toString(),
        planId: planId,
        userId: userId,
        amount: plan.price,
        billingCycle: plan.billingCycle,
        stripeSubscriptionId: stripeSubscription.id,
      });
    }
  }

  // Return populated subscription
  const populated = await populateSubscription(subscription._id);

  if (isNewlyCreated) {
    const maybeDoc = populated as unknown as { toObject?: () => unknown };
    const invoicePayload = maybeDoc.toObject
      ? (maybeDoc.toObject() as SubscriptionForInvoice)
      : (populated as unknown as SubscriptionForInvoice);

    try {
      await sendSubscriptionInvoiceEmail(invoicePayload);
    } catch (error) {
      console.error('Failed to send subscription invoice email:', error);
    }
  }

  return populated;
};

const handleCheckoutSessionCompletedEvent = async (
  session: Stripe.Checkout.Session
) => {
  if (session.mode !== 'subscription') {
    return null;
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    return null;
  }

  const stripe = getStripeOrThrow();
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscriptionId
  );

  const { userId, planId } = await resolveUserAndPlanForStripeSubscription(
    stripeSubscription
  );

  const stripeCustomerId = resolveStripeCustomerId(stripeSubscription, session);

  return syncSubscriptionFromStripe({
    userId,
    planId,
    stripeSubscription,
    stripeCustomerId,
  });
};

const handleCustomerSubscriptionEvent = async (
  stripeSubscription: Stripe.Subscription
) => {
  const { userId, planId } = await resolveUserAndPlanForStripeSubscription(
    stripeSubscription
  );

  const stripeCustomerId = resolveStripeCustomerId(stripeSubscription);

  return syncSubscriptionFromStripe({
    userId,
    planId,
    stripeSubscription,
    stripeCustomerId,
  });
};

export {
  findPlanByIdOrThrow,
  findUserByIdOrThrow,
  unixToDate,
  mapStripeSubscriptionStatus,
  resolveUserAndPlanForStripeSubscription,
  updateUserPremiumFlag,
  ensurePlanExists,
  ensureUserExists,
  ensureOrganizationExists,
  ensurePeriodRangeIsValid,
  ensureUserSubscriptionLimit,
  populateSubscription,
  syncSubscriptionFromStripe,
  handleCheckoutSessionCompletedEvent,
  handleCustomerSubscriptionEvent,
};
