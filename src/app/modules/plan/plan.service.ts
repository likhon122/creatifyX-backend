import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { TCreatePlanPayload, TUpdatePlanPayload } from './plan.interface';
import Plan from './plan.model';
import { createStripePriceForPlan } from '../../utils/stripe/stripeHelpers';

const createPlanHandler = async (payload: TCreatePlanPayload) => {
  const createPlanSlug = payload.name.toLowerCase().replace(/ /g, '-');

  // Check the plan is already exists in the database
  const isPlanExists = await Plan.findOne({
    $and: [
      { slug: createPlanSlug },
      { type: payload.type },
      { billingCycle: payload.billingCycle },
    ],
  });

  if (isPlanExists) {
    throw new AppError(httpStatus.CONFLICT, 'Plan already exists');
  }

  let stripePriceId = payload.stripePriceId;
  if (!stripePriceId) {
    const priceInfo = await createStripePriceForPlan({
      name: payload.name,
      amount: payload.price,
      currency: payload.currency,
      billingCycle: payload.billingCycle,
      metadata: {
        planType: payload.type,
      },
    });
    stripePriceId = priceInfo.priceId;
  }

  const plan = new Plan({
    ...payload,
    slug: createPlanSlug,
    stripePriceId,
    features: payload.features ?? [],
    isActive: payload.isActive ?? true,
  });
  await plan.save();
  if (!plan) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create plan'
    );
  }
  return plan;
};

const updatePlanHandler = async (id: string, payload: TUpdatePlanPayload) => {
  const isPlanExists = await Plan.findById(id);
  if (!isPlanExists) {
    throw new Error('Plan not found');
  }

  if (payload.name || payload.type || payload.billingCycle) {
    if (payload.name === undefined) {
      payload.name = isPlanExists.name;
    }
    if (payload.type === undefined) {
      payload.type = isPlanExists.type;
    }
    if (payload.billingCycle === undefined) {
      payload.billingCycle = isPlanExists.billingCycle;
    }
  }

  // Check the plan is already exists in the database
  const isPlanExistsInDatabase = await Plan.findOne({
    $and: [
      { name: payload.name },
      { type: payload.type },
      { billingCycle: payload.billingCycle },
    ],
  });

  if (isPlanExistsInDatabase) {
    throw new AppError(httpStatus.CONFLICT, 'Plan already exists');
  }

  let stripePriceId = payload.stripePriceId;
  const priceShouldRegenerate =
    !stripePriceId &&
    (payload.price !== undefined ||
      payload.currency !== undefined ||
      payload.billingCycle !== undefined);

  if (priceShouldRegenerate) {
    const priceInfo = await createStripePriceForPlan({
      name: payload.name ?? isPlanExists.name,
      amount: payload.price ?? isPlanExists.price,
      currency: payload.currency ?? isPlanExists.currency,
      billingCycle: payload.billingCycle ?? isPlanExists.billingCycle,
      metadata: {
        planId: isPlanExists._id.toString(),
      },
    });
    stripePriceId = priceInfo.priceId;
  }

  const updatePayload: TUpdatePlanPayload = {
    ...payload,
    features: payload.features ?? isPlanExists.features,
  };

  if (stripePriceId) {
    updatePayload.stripePriceId = stripePriceId;
  }

  const plan = await Plan.findByIdAndUpdate(id, updatePayload, { new: true });
  if (!plan) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update plan'
    );
  }
  return plan;
};

const getAllPlansHandler = async () => {
  const plans = await Plan.find().select('-createdAt -updatedAt -__v');
  return plans;
};

export { createPlanHandler, updatePlanHandler, getAllPlansHandler };
