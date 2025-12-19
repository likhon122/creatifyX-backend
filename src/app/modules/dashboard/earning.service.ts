import { Types } from 'mongoose';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { Earning } from './earning.model';
import { SubscriptionRevenue } from './subscriptionRevenue.model';
import { IndividualPaymentRevenue } from './individualPaymentRevenue.model';
import { User } from '../user/user.model';
import { Asset } from '../asset/asset.model';
import { IndividualPayment } from '../individualPayment/individualPayment.model';
import { TCreateEarningInput } from './dashboard.interface';

/**
 * Calculate earnings based on buyer premium status
 * Premium users: Author gets 70% of (price - 30%) = 70% of 70% = 49% of original price
 * Non-premium users: Author gets 60% of (price - 30%) = 60% of 70% = 42% of original price
 *
 * Simplified:
 * - Premium buyer: Platform takes 30%, then 30% more from remaining → Author gets 49%, Company gets 51%
 * - Non-premium buyer: Platform takes 30%, then 40% more from remaining → Author gets 42%, Company gets 58%
 */
const calculateEarnings = (
  assetPrice: number,
  isPremiumBuyer: boolean
): {
  platformFeePercentage: number;
  authorEarning: number;
  companyEarning: number;
  platformFee: number;
} => {
  // First, apply the base platform discount (30%)
  const discountedPrice = assetPrice * 0.7; // 70% of original price

  let platformFeePercentage: number;
  let authorEarning: number;

  if (isPremiumBuyer) {
    // Premium users: Company takes 30% of the discounted price
    platformFeePercentage = 30;
    authorEarning = discountedPrice * 0.7; // Author gets 70% of discounted price
  } else {
    // Non-premium users: Company takes 40% of the discounted price
    platformFeePercentage = 40;
    authorEarning = discountedPrice * 0.6; // Author gets 60% of discounted price
  }

  const companyEarning = discountedPrice - authorEarning;
  const platformFee = assetPrice - discountedPrice; // The initial 30% discount

  return {
    platformFeePercentage,
    authorEarning: Number(authorEarning.toFixed(2)),
    companyEarning: Number(companyEarning.toFixed(2)),
    platformFee: Number(platformFee.toFixed(2)),
  };
};

/**
 * Create earning record when payment is completed
 */
const createEarningRecord = async (
  payload: TCreateEarningInput
): Promise<void> => {
  const { authorId, assetId, paymentId, buyerId, assetPrice, isPremiumBuyer } =
    payload;

  // Check if earning record already exists for this payment
  const existingEarning = await Earning.findOne({ payment: paymentId });
  if (existingEarning) {
    console.warn(
      `[Earning] Record already exists for payment ${paymentId}, skipping`
    );
    return;
  }

  // Verify entities exist
  const [author, asset, payment, buyer] = await Promise.all([
    User.findById(authorId),
    Asset.findById(assetId),
    IndividualPayment.findById(paymentId),
    User.findById(buyerId),
  ]);

  if (!author) {
    throw new AppError(httpStatus.NOT_FOUND, 'Author not found');
  }

  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  if (!buyer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Buyer not found');
  }

  // Calculate earnings
  const { platformFeePercentage, authorEarning, companyEarning, platformFee } =
    calculateEarnings(assetPrice, isPremiumBuyer);

  // Create earning record
  await Earning.create({
    author: authorId,
    asset: assetId,
    payment: paymentId,
    buyer: buyerId,
    assetPrice,
    isPremiumBuyer,
    platformFee,
    platformFeePercentage,
    authorEarning,
    companyEarning,
    earningDate: payment.transactionDate || new Date(),
  });

  // Update author's total earnings
  author.totalEarnings = (author.totalEarnings || 0) + authorEarning;
  await author.save();

  console.warn(
    `[Earning Created] Author ${author.email} earned $${authorEarning} from asset ${asset.title} (Premium: ${isPremiumBuyer})`
  );
};

/**
 * Get date range filters
 */
const getDateRange = (
  period: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear'
): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisWeek': {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as first day
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisYear':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
};

/**
 * Get earnings for a specific time period
 */
const getEarningsForPeriod = async (
  authorId: string,
  period: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear'
): Promise<number> => {
  const { start, end } = getDateRange(period);

  const result = await Earning.aggregate([
    {
      $match: {
        author: new Types.ObjectId(authorId),
        earningDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$authorEarning' },
      },
    },
  ]);

  return result[0]?.total || 0;
};

/**
 * Get company earnings for a specific time period
 */
const getCompanyEarningsForPeriod = async (
  period:
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'thisMonth'
    | 'thisYear'
    | 'lifetime'
): Promise<number> => {
  let matchCondition: { earningDate?: { $gte: Date; $lte: Date } } = {};

  if (period !== 'lifetime') {
    const { start, end } = getDateRange(period);
    matchCondition = { earningDate: { $gte: start, $lte: end } };
  }

  const result = await Earning.aggregate([
    ...(period !== 'lifetime' ? [{ $match: matchCondition }] : []),
    {
      $group: {
        _id: null,
        total: { $sum: '$companyEarning' },
      },
    },
  ]);

  return result[0]?.total || 0;
};

/**
 * Get total earnings for all authors in a period
 */
const getTotalAuthorEarningsForPeriod = async (
  period:
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'thisMonth'
    | 'thisYear'
    | 'lifetime'
): Promise<number> => {
  let matchCondition: { earningDate?: { $gte: Date; $lte: Date } } = {};

  if (period !== 'lifetime') {
    const { start, end } = getDateRange(period);
    matchCondition = { earningDate: { $gte: start, $lte: end } };
  }

  const result = await Earning.aggregate([
    ...(period !== 'lifetime' ? [{ $match: matchCondition }] : []),
    {
      $group: {
        _id: null,
        total: { $sum: '$authorEarning' },
      },
    },
  ]);

  return result[0]?.total || 0;
};

/**
 * Create subscription revenue record
 */
const createSubscriptionRevenueRecord = async (payload: {
  subscriptionId: string;
  planId: string;
  userId: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  stripeSubscriptionId: string;
}): Promise<void> => {
  const {
    subscriptionId,
    planId,
    userId,
    amount,
    billingCycle,
    stripeSubscriptionId,
  } = payload;

  // Check if revenue record already exists for this subscription
  const existingRevenue = await SubscriptionRevenue.findOne({
    subscription: subscriptionId,
    stripeSubscriptionId,
  });

  if (existingRevenue) {
    console.warn(
      `[Subscription Revenue] Record already exists for subscription ${subscriptionId}, skipping`
    );
    return;
  }

  // 100% of subscription revenue goes to company (no author split)
  const companyRevenue = amount;

  // Create revenue record
  await SubscriptionRevenue.create({
    subscription: subscriptionId,
    plan: planId,
    user: userId,
    amount,
    billingCycle,
    companyRevenue,
    revenueDate: new Date(),
    stripeSubscriptionId,
  });

  console.warn(
    `[Subscription Revenue Created] User ${userId} subscription revenue $${amount} recorded`
  );
};

/**
 * Get total subscription revenue for a period
 */
const getSubscriptionRevenueForPeriod = async (
  period:
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'thisMonth'
    | 'thisYear'
    | 'lifetime'
): Promise<number> => {
  let matchCondition: { revenueDate?: { $gte: Date; $lte: Date } } = {};

  if (period !== 'lifetime') {
    const { start, end } = getDateRange(period);
    matchCondition = { revenueDate: { $gte: start, $lte: end } };
  }

  const result = await SubscriptionRevenue.aggregate([
    ...(period !== 'lifetime' ? [{ $match: matchCondition }] : []),
    {
      $group: {
        _id: null,
        total: { $sum: '$companyRevenue' },
      },
    },
  ]);

  return result[0]?.total || 0;
};

/**
 * Create individual payment revenue record
 */
const createIndividualPaymentRevenueRecord = async ({
  paymentId,
  assetId,
  authorId,
  buyerId,
  amount,
  authorRevenue,
  companyRevenue,
  isPremiumBuyer,
  stripePaymentIntentId,
}: {
  paymentId: string;
  assetId: string;
  authorId: string;
  buyerId: string;
  amount: number;
  authorRevenue: number;
  companyRevenue: number;
  isPremiumBuyer: boolean;
  stripePaymentIntentId?: string;
}): Promise<void> => {
  await IndividualPaymentRevenue.create({
    payment: paymentId,
    asset: assetId,
    author: authorId,
    buyer: buyerId,
    amount,
    authorRevenue,
    companyRevenue,
    isPremiumBuyer,
    revenueDate: new Date(),
    stripePaymentIntentId,
  });

  console.warn(
    `[Individual Payment Revenue Created] Payment ${paymentId} revenue $${amount} recorded (Author: $${authorRevenue}, Company: $${companyRevenue})`
  );
};

/**
 * Get total individual payment revenue for a period (for admin dashboard)
 */
const getIndividualPaymentRevenueForPeriod = async (
  period:
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'thisMonth'
    | 'thisYear'
    | 'lifetime',
  revenueType: 'total' | 'author' | 'company' = 'total'
): Promise<number> => {
  let matchCondition: { revenueDate?: { $gte: Date; $lte: Date } } = {};

  if (period !== 'lifetime') {
    const { start, end } = getDateRange(period);
    matchCondition = { revenueDate: { $gte: start, $lte: end } };
  }

  let sumField: string | { $add: string[] };
  if (revenueType === 'author') {
    sumField = '$authorRevenue';
  } else if (revenueType === 'company') {
    sumField = '$companyRevenue';
  } else {
    sumField = { $add: ['$authorRevenue', '$companyRevenue'] };
  }

  const result = await IndividualPaymentRevenue.aggregate([
    ...(period !== 'lifetime' ? [{ $match: matchCondition }] : []),
    {
      $group: {
        _id: null,
        total: { $sum: sumField },
      },
    },
  ]);

  return result[0]?.total || 0;
};

export const EarningService = {
  createEarningRecord,
  calculateEarnings,
  getEarningsForPeriod,
  getCompanyEarningsForPeriod,
  getTotalAuthorEarningsForPeriod,
  getDateRange,
  createSubscriptionRevenueRecord,
  getSubscriptionRevenueForPeriod,
  createIndividualPaymentRevenueRecord,
  getIndividualPaymentRevenueForPeriod,
};
