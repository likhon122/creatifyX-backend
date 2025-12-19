import Stripe from 'stripe';
import { PipelineStage, Types } from 'mongoose';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import QueryBuilder from '../../builder/queryBuilder';
import { stripeCancelUrl, stripeSuccessUrl } from '../../config';
import { Subscription } from './subscription.model';
import Plan from '../plan/plan.model';
import { User } from '../user/user.model';
import { Organization } from '../organization/organization.model';
import { subscriptionStatus } from './subscription.constant';

import {
  ensureOrganizationExists,
  ensurePeriodRangeIsValid,
  ensurePlanExists,
  ensureUserExists,
  ensureUserSubscriptionLimit,
  findPlanByIdOrThrow,
  findUserByIdOrThrow,
  handleCheckoutSessionCompletedEvent,
  handleCustomerSubscriptionEvent,
  populateSubscription,
  resolveUserAndPlanForStripeSubscription,
  syncSubscriptionFromStripe,
  unixToDate,
} from '../../utils/subscription/subscriptionHelpers';
import {
  getStripeOrThrow,
  resolveStripeCustomerId,
} from '../../utils/stripe/stripeHelpers';
import {
  CreateCheckoutSessionInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  VerifyCheckoutSessionInput,
} from './subscription.types';

const createCheckoutSessionHandler = async (
  userId: string,
  payload: CreateCheckoutSessionInput
) => {
  // Validate user by userId
  const user = await findUserByIdOrThrow(userId);

  // Check user subscription limit
  await ensureUserSubscriptionLimit(userId);

  // Validate plan
  const plan = await findPlanByIdOrThrow(payload.planId);
  if (plan.isActive === false) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Plan is not active');
  }

  if (!plan.stripePriceId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Plan is not configured for Stripe billing. Please contact support. Report this issue.'
    );
  }

  // Create Stripe checkout session
  const stripe = getStripeOrThrow();

  // Prepare metadata for the session and subscription this metadata will help to link the subscription to user and plan
  const metadata = {
    userId: user._id.toString(),
    planId: plan._id.toString(),
  };

  // Create the checkout session with metadata
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    success_url: payload.successUrl || stripeSuccessUrl,
    cancel_url: payload.cancelUrl || stripeCancelUrl,
    allow_promotion_codes: true,
    client_reference_id: `${metadata.userId}:${metadata.planId}`,
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
  });

  // Validate session creation
  if (!session.url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to generate Stripe checkout session'
    );
  }

  const expiresAt = session.expires_at
    ? unixToDate(session.expires_at)
    : undefined;

  // Return session details
  return {
    sessionId: session.id,
    url: session.url,
    expiresAt,
  };
};

const verifyCheckoutSessionHandler = async (
  userId: string,
  payload: VerifyCheckoutSessionInput
) => {
  // Get Stripe instance
  const stripe = getStripeOrThrow();

  // Retrieve the checkout session (getting expanded subscription data)
  const session = await stripe.checkout.sessions.retrieve(payload.sessionId, {
    expand: ['subscription'],
  });

  // Validate session details
  if (session.payment_status !== 'paid') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment is not completed for this session yet'
    );
  }

  // Ensure the session belongs to the authenticated user
  if (session.metadata?.userId && session.metadata.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Checkout session does not belong to this user'
    );
  }

  // Validate subscription data in the session
  const subscriptionData = session.subscription as Stripe.Subscription | null;
  if (!subscriptionData) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Session is not associated with a Stripe subscription'
    );
  }

  if (subscriptionData.status === 'incomplete') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Stripe subscription is still incomplete'
    );
  }

  // Resolve userId and planId from the subscription metadata If metadata is missing or does not match, throw an error If metadata is valid then return the actual userId and planId if not valid then check it's already have our DB if not have then throw error
  const { userId: ownerUserId, planId } =
    await resolveUserAndPlanForStripeSubscription(subscriptionData);

  // Ensure the subscription metadata userId matches the authenticated userId
  if (ownerUserId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Checkout session metadata does not match the authenticated user'
    );
  }

  // Get Stripe customer ID
  const stripeCustomerId = resolveStripeCustomerId(subscriptionData, session);

  // Sync subscription from Stripe and  create or update local subscription record
  return syncSubscriptionFromStripe({
    userId: ownerUserId,
    planId,
    stripeSubscription: subscriptionData,
    stripeCustomerId,
  });
};

const createSubscriptionHandler = async (payload: CreateSubscriptionInput) => {
  await ensurePlanExists(payload.plan);

  if (payload.user) {
    await ensureUserExists(payload.user);
    await ensureUserSubscriptionLimit(payload.user);
  }

  if (payload.organization) {
    await ensureOrganizationExists(payload.organization);
  }

  ensurePeriodRangeIsValid(
    payload.currentPeriodStart,
    payload.currentPeriodEnd
  );

  const subscription = await Subscription.create({
    plan: payload.plan,
    user: payload.user,
    organization: payload.organization,
    status: payload.status ?? subscriptionStatus.active,
    stripeCustomerId: payload.stripeCustomerId,
    stripeSubscriptionId: payload.stripeSubscriptionId,
    currentPeriodStart: payload.currentPeriodStart,
    currentPeriodEnd: payload.currentPeriodEnd,
    cancelAtPeriodEnd: payload.cancelAtPeriodEnd ?? false,
  });

  return populateSubscription(subscription._id);
};

const updateSubscriptionHandler = async (
  id: string,
  payload: UpdateSubscriptionInput
) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  if (payload.plan) {
    await ensurePlanExists(payload.plan);
    subscription.plan = new Types.ObjectId(payload.plan);
  }

  if (payload.user !== undefined) {
    if (payload.user) {
      await ensureUserExists(payload.user);
      await ensureUserSubscriptionLimit(payload.user, subscription._id);
      subscription.user = new Types.ObjectId(payload.user);
      subscription.organization = undefined;
    } else {
      subscription.user = undefined;
    }
  }

  if (payload.organization !== undefined) {
    if (payload.organization) {
      await ensureOrganizationExists(payload.organization);
      subscription.organization = new Types.ObjectId(payload.organization);
      if (payload.user === undefined) {
        subscription.user = undefined;
      }
    } else {
      subscription.organization = undefined;
    }
  }

  if (payload.status) {
    subscription.status = payload.status;
  }

  if (payload.stripeCustomerId) {
    subscription.stripeCustomerId = payload.stripeCustomerId;
  }

  if (payload.stripeSubscriptionId) {
    subscription.stripeSubscriptionId = payload.stripeSubscriptionId;
  }

  if (payload.currentPeriodStart) {
    subscription.currentPeriodStart = payload.currentPeriodStart;
  }

  if (payload.currentPeriodEnd) {
    subscription.currentPeriodEnd = payload.currentPeriodEnd;
  }

  ensurePeriodRangeIsValid(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd
  );

  if (payload.cancelAtPeriodEnd !== undefined) {
    subscription.cancelAtPeriodEnd = payload.cancelAtPeriodEnd;
  }

  await subscription.save();

  return populateSubscription(subscription._id);
};

const getSingleSubscriptionHandler = async (id: string) => {
  const subscription = await Subscription.findById(id)
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

const getAllSubscriptionsHandler = async (
  params: Record<string, unknown> = {}
) => {
  // Make a instance of QueryBuilder
  const builder = new QueryBuilder(params);

  // Configure query builder with filters, search, sort, project, and paginate
  builder
    .search(['stripeCustomerId', 'stripeSubscriptionId'])
    .filterExact('status', 'status')
    .filterBoolean('cancelAtPeriodEnd', 'cancelAtPeriodEnd')
    .filterObjectId('plan', 'plan')
    .filterObjectId('user', 'user')
    .filterObjectId('organization', 'organization')
    .range('currentPeriodStart', 'periodStartFrom', 'periodStartTo')
    .range('currentPeriodEnd', 'periodEndFrom', 'periodEndTo')
    .sort()
    .project()
    .paginate();

  // Build aggregation stages
  const { resultStages } = builder.build();

  // Define lookup stages to populate related fields
  const lookupStages: PipelineStage[] = [
    {
      $lookup: {
        from: Plan.collection.name,
        localField: 'plan',
        foreignField: '_id',
        as: 'plan',
      },
    },
    {
      $unwind: {
        path: '$plan',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: User.collection.name,
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              password: 0,
              resetPasswordToken: 0,
              resetPasswordExpires: 0,
              passwordResetToken: 0,
              passwordResetExpires: 0,
              passwordResetIp: 0,
              loginOtp: 0,
              loginOtpExpires: 0,
              __v: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: Organization.collection.name,
        localField: 'organization',
        foreignField: '_id',
        as: 'organization',
        pipeline: [
          {
            $project: {
              __v: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$organization',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  // Sanitize stage to remove sensitive fields
  const sanitizeStage: PipelineStage = {
    $unset: ['__v'],
  };

  // First stage is resultStages[0]; means the first stage from the built aggregation stages
  const firstStage = resultStages[0];
  // hasMatchStage checks if the first stage is a $match stage
  const hasMatchStage =
    firstStage && typeof firstStage === 'object' && '$match' in firstStage;

  // Match stage is see if the first stage is a $match stage then use it otherwise undefined
  const matchStage = hasMatchStage
    ? (firstStage as PipelineStage.Match)
    : undefined;

  // postMatchStages contains the remaining stages after the match stage
  const postMatchStages = hasMatchStage ? resultStages.slice(1) : resultStages;

  const dataPipeline: PipelineStage[] = [...postMatchStages, sanitizeStage];
  const metaPipeline: PipelineStage[] = [{ $count: 'total' }];

  // Make a sub pipeline with facet stage and execute the data and meta pipelines
  const facetStage: PipelineStage = {
    $facet: {
      data: dataPipeline,
      meta: metaPipeline,
    } as Record<string, PipelineStage[]>,
  } as unknown as PipelineStage;

  // Make a beautiful object to handle meta total count
  const addFieldsStage: PipelineStage = {
    $addFields: {
      meta: {
        $ifNull: [{ $arrayElemAt: ['$meta', 0] }, { total: 0 }],
      },
    },
  };

  // Initialize the final aggregation pipeline
  const facetPipeline: PipelineStage[] = [
    ...(matchStage ? [matchStage] : []),
    ...lookupStages,
    facetStage,
    addFieldsStage,
  ];

  // Fetch the final aggregated data using the constructed pipeline
  const aggregated = await Subscription.aggregate(facetPipeline);

  // Extract facet result and meta information
  const facetResult = aggregated[0] ?? { data: [], meta: { total: 0 } };

  // Calculate total and build meta information
  const total = (facetResult.meta?.total as number | undefined) ?? 0;

  // Build meta information
  const meta = builder.buildMeta(total);

  // Return the final data and meta
  return { data: (facetResult.data as unknown[]) ?? [], meta };
};

const processStripeWebhookEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutSessionCompletedEvent(
        event.data.object as Stripe.Checkout.Session
      );
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end':
      return handleCustomerSubscriptionEvent(
        event.data.object as Stripe.Subscription
      );
    default:
      return null;
  }
};

export {
  createCheckoutSessionHandler,
  createSubscriptionHandler,
  updateSubscriptionHandler,
  getAllSubscriptionsHandler,
  getSingleSubscriptionHandler,
  verifyCheckoutSessionHandler,
  processStripeWebhookEvent,
};
