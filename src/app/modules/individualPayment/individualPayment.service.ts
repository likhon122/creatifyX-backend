import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { Asset } from '../asset/asset.model';
import { User } from '../user/user.model';
import { IndividualPayment } from './individualPayment.model';
import {
  CreateIndividualPaymentInput,
  TIndividualPayment,
} from './individualPayment.interface';
import { PREMIUM_DISCOUNT_PERCENTAGE } from './individualPayment.constant';
import { getStripeClient } from '../../utils/stripeClient';
import QueryBuilder from '../../builder/queryBuilder';
import { PipelineStage, Types } from 'mongoose';
import type Stripe from 'stripe';
import {
  sendIndividualPaymentInvoiceEmail,
  PaymentForInvoice,
} from '../../utils/email/individualPaymentInvoice';
import { EarningService } from '../dashboard/earning.service';

const calculatePaymentAmount = (
  originalPrice: number,
  discountPrice: number | undefined,
  isPremiumUser: boolean
): { originalPrice: number; discountAmount: number; finalPrice: number } => {
  // Use discount price if available, otherwise use original price
  const basePrice = discountPrice ?? originalPrice;

  // Apply 30% premium discount if user has premium subscription
  const discountAmount = isPremiumUser
    ? (basePrice * PREMIUM_DISCOUNT_PERCENTAGE) / 100
    : 0;

  const finalPrice = basePrice - discountAmount;

  return {
    originalPrice: basePrice,
    discountAmount,
    finalPrice: Math.max(0, finalPrice), // Ensure non-negative
  };
};

const createCheckoutSessionHandler = async (
  userId: string,
  assetId: string,
  successUrl?: string,
  cancelUrl?: string
) => {
  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Check if asset is approved
  if (asset.status !== 'approved') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Asset is not available for purchase'
    );
  }

  // Get user details
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if user already purchased this asset
  const existingPayment = await IndividualPayment.findOne({
    user: userId,
    asset: assetId,
    paymentStatus: 'completed',
  });

  if (existingPayment) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already purchased this asset'
    );
  }

  // Determine if user has premium subscription
  const isPremiumUser = user.isPremium === true;

  // Calculate payment amounts
  const { originalPrice, discountAmount, finalPrice } = calculatePaymentAmount(
    asset.price,
    asset.discountPrice,
    isPremiumUser
  );

  // Create Stripe checkout session
  const stripe = getStripeClient();

  // Default URLs
  const defaultSuccessUrl = `${
    process.env.FRONTEND_URL || 'http://localhost:3000'
  }/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const defaultCancelUrl = `${
    process.env.FRONTEND_URL || 'http://localhost:3000'
  }/asset/${assetId}`;

  const metadata = {
    userId: userId,
    assetId: assetId,
    originalPrice: originalPrice.toString(),
    discountAmount: discountAmount.toString(),
    finalPrice: finalPrice.toString(),
    isPremiumUser: isPremiumUser.toString(),
    paymentType: 'individual_asset',
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    success_url: successUrl || defaultSuccessUrl,
    cancel_url: cancelUrl || defaultCancelUrl,
    client_reference_id: `${userId}:${assetId}`,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: asset.title,
            description: `Purchase of ${asset.assetType} asset`,
            images: asset.previews?.thumbnail?.secure_url
              ? [asset.previews.thumbnail.secure_url]
              : [],
          },
          unit_amount: Math.round(finalPrice * 100), // Stripe expects amount in cents
        },
        quantity: 1,
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
    },
  });

  if (!session.url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create Stripe checkout session'
    );
  }

  // Create pending payment record
  const paymentData: CreateIndividualPaymentInput = {
    user: userId,
    asset: assetId,
    originalPrice,
    discountAmount,
    finalPrice,
    isPremiumUser,
    stripeSessionId: session.id,
    paymentMethod: 'stripe',
  };

  const payment = await IndividualPayment.create(paymentData);

  return {
    sessionId: session.id,
    sessionUrl: session.url,
    payment,
  };
};

const verifyCheckoutSessionHandler = async (sessionId: string) => {
  // Find payment record
  const payment = await IndividualPayment.findOne({
    stripeSessionId: sessionId,
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment record not found');
  }

  // Verify session with Stripe
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === 'paid') {
    const wasAlreadyCompleted = payment.paymentStatus === 'completed';

    payment.paymentStatus = 'completed';
    payment.stripePaymentIntentId = session.payment_intent as string;
    payment.transactionDate = new Date();
    await payment.save();

    // Populate user and asset details
    await payment.populate('asset');
    await payment.populate('user');

    // Track earnings only if this is the first time payment is completed
    if (!wasAlreadyCompleted) {
      await processPaymentEarnings(payment._id.toString());
      console.warn(
        `[Earnings Tracked] Verify payment ${payment._id} earning recorded`
      );
    }

    // Send invoice email only if this is the first time payment is completed
    if (!wasAlreadyCompleted) {
      console.warn('Payment completed via verify endpoint, sending invoice...');
      const populatedPayment = await IndividualPayment.findById(payment._id)
        .populate({
          path: 'user',
          select: 'name email',
        })
        .populate({
          path: 'asset',
          select: 'title assetType',
        });

      if (populatedPayment) {
        console.warn(
          'Preparing to send invoice email for payment:',
          payment._id
        );
        const userEmail = (populatedPayment.user as { email?: string })?.email;
        const assetTitle = (populatedPayment.asset as { title?: string })
          ?.title;
        console.warn('User email:', userEmail);
        console.warn('Asset title:', assetTitle);

        const maybeDoc = populatedPayment as unknown as {
          toObject?: () => unknown;
        };
        const invoicePayload = maybeDoc.toObject
          ? (maybeDoc.toObject() as PaymentForInvoice)
          : (populatedPayment as unknown as PaymentForInvoice);

        try {
          console.warn('Calling sendIndividualPaymentInvoiceEmail...');
          await sendIndividualPaymentInvoiceEmail(invoicePayload);
          console.warn(
            'Invoice email sent successfully for payment:',
            payment._id
          );
        } catch (error) {
          console.error(
            'Failed to send individual payment invoice email:',
            error
          );
          console.error(
            'Error details:',
            error instanceof Error ? error.stack : error
          );
        }
      } else {
        console.warn('Could not populate payment for invoice email');
      }
    } else {
      console.warn('Payment already completed, skipping invoice email');
    }

    return payment;
  }

  if (session.status === 'expired') {
    payment.paymentStatus = 'failed';
    await payment.save();
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment session expired');
  }

  throw new AppError(httpStatus.BAD_REQUEST, 'Payment not completed');
};

const getPaymentHistoryHandler = async (
  userId: string,
  params: Record<string, unknown> = {}
) => {
  const builder = new QueryBuilder(params);

  builder
    .filterExact('status', 'paymentStatus')
    .sort('-transactionDate')
    .paginate();

  const { resultStages } = builder.build();

  // Lookup stages for asset details
  const lookupStages: PipelineStage[] = [
    {
      $lookup: {
        from: Asset.collection.name,
        localField: 'asset',
        foreignField: '_id',
        as: 'assetDetails',
      },
    },
    {
      $unwind: {
        path: '$assetDetails',
        preserveNullAndEmptyArrays: false,
      },
    },
  ];

  // User filter stage
  const userMatchStage: PipelineStage = {
    $match: { user: new Types.ObjectId(userId) },
  };

  // Build data pipeline with all stages in correct order
  const dataPipeline: PipelineStage[] = [
    userMatchStage,
    ...lookupStages,
    ...resultStages,
  ];

  // Meta pipeline to count total
  const metaPipeline: PipelineStage[] = [userMatchStage, { $count: 'total' }];

  // Facet stage
  const facetStage: PipelineStage = {
    $facet: {
      data: dataPipeline,
      meta: metaPipeline,
    } as Record<string, PipelineStage[]>,
  } as unknown as PipelineStage;

  const addFieldsStage: PipelineStage = {
    $addFields: {
      meta: {
        $ifNull: [{ $arrayElemAt: ['$meta', 0] }, { total: 0 }],
      },
    },
  };

  const aggregated = await IndividualPayment.aggregate([
    facetStage,
    addFieldsStage,
  ]);

  const facetResult = aggregated[0] ?? { data: [], meta: { total: 0 } };
  const total = (facetResult.meta?.total as number | undefined) ?? 0;
  const meta = builder.buildMeta(total);

  return { data: (facetResult.data as TIndividualPayment[]) ?? [], meta };
};

const checkAssetPurchaseHandler = async (userId: string, assetId: string) => {
  const payment = await IndividualPayment.findOne({
    user: userId,
    asset: assetId,
    paymentStatus: 'completed',
  });

  return {
    isPurchased: !!payment,
    payment: payment || null,
  };
};

/**
 * Process earnings for a completed payment
 * This should be called whenever a payment status changes to 'completed'
 */
const processPaymentEarnings = async (paymentId: string) => {
  const payment = await IndividualPayment.findById(paymentId);

  if (!payment) {
    console.error(`[Earnings] Payment ${paymentId} not found`);
    return;
  }

  if (payment.paymentStatus !== 'completed') {
    console.warn(`[Earnings] Payment ${paymentId} is not completed, skipping`);
    return;
  }

  // Check if earnings already processed
  const existingEarning = await EarningService.calculateEarnings;

  // Get asset and author details
  const asset = await Asset.findById(payment.asset).select(
    'author price discountPrice title'
  );

  if (!asset) {
    console.error(
      `[Earnings] Asset ${payment.asset} not found for payment ${paymentId}`
    );
    return;
  }

  try {
    console.warn(
      `[Earnings Processing] Starting for payment ${payment._id}, asset ${payment.asset}, author ${asset.author}`
    );

    // Create earning record (this also updates author's totalEarnings)
    await EarningService.createEarningRecord({
      authorId: asset.author.toString(),
      assetId: payment.asset.toString(),
      paymentId: payment._id.toString(),
      buyerId: payment.user.toString(),
      assetPrice: payment.originalPrice,
      isPremiumBuyer: payment.isPremiumUser,
    });

    console.warn(
      `[Earnings Processed] Payment ${payment._id} earning recorded for author ${asset.author}`
    );

    // Calculate revenue splits for dashboard analytics
    const { authorEarning, companyEarning } = EarningService.calculateEarnings(
      payment.originalPrice,
      payment.isPremiumUser
    );

    console.warn(
      `[Revenue Split] Author: $${authorEarning}, Company: $${companyEarning}`
    );

    // Create individual payment revenue record for dashboard
    await EarningService.createIndividualPaymentRevenueRecord({
      paymentId: payment._id.toString(),
      assetId: payment.asset.toString(),
      authorId: asset.author.toString(),
      buyerId: payment.user.toString(),
      amount: payment.finalPrice,
      authorRevenue: authorEarning,
      companyRevenue: companyEarning,
      isPremiumBuyer: payment.isPremiumUser,
      stripePaymentIntentId: payment.stripePaymentIntentId,
    });

    console.warn(
      `[Payment Revenue] Dashboard record created for payment ${payment._id}`
    );
  } catch (error) {
    console.error('[Earnings Processing] Failed:', error);
    console.error(
      'Error details:',
      error instanceof Error ? error.message : error
    );
    console.error(
      'Stack trace:',
      error instanceof Error ? error.stack : 'No stack'
    );
  }
};

const handleCheckoutSessionCompletedEvent = async (
  session: Stripe.Checkout.Session
) => {
  const metadata = session.metadata;

  if (!metadata?.paymentType || metadata.paymentType !== 'individual_asset') {
    return; // Not an individual payment, skip
  }

  const {
    userId,
    assetId,
    originalPrice,
    discountAmount,
    finalPrice,
    isPremiumUser,
  } = metadata;

  if (!userId || !assetId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid metadata in checkout session'
    );
  }

  // Find or create payment record
  let payment = await IndividualPayment.findOne({
    stripeSessionId: session.id,
  });

  if (!payment) {
    // Create new payment record from webhook
    const paymentData: CreateIndividualPaymentInput = {
      user: userId,
      asset: assetId,
      originalPrice: parseFloat(originalPrice || '0'),
      discountAmount: parseFloat(discountAmount || '0'),
      finalPrice: parseFloat(finalPrice || '0'),
      isPremiumUser: isPremiumUser === 'true',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      paymentMethod: 'stripe',
    };

    payment = await IndividualPayment.create(paymentData);
  }

  // Update payment status
  payment.paymentStatus = 'completed';
  payment.stripePaymentIntentId = session.payment_intent as string;
  payment.transactionDate = new Date();
  await payment.save();

  // Process earnings using the centralized function
  await processPaymentEarnings(payment._id.toString());

  // Populate payment with user and asset details for invoice
  const populatedPayment = await IndividualPayment.findById(payment._id)
    .populate({
      path: 'user',
      select: 'name email',
    })
    .populate({
      path: 'asset',
      select: 'title assetType',
    });

  // Send invoice email
  if (populatedPayment) {
    console.warn('Preparing to send invoice email for payment:', payment._id);
    const userEmail = (populatedPayment.user as { email?: string })?.email;
    const assetTitle = (populatedPayment.asset as { title?: string })?.title;
    console.warn('User email:', userEmail);
    console.warn('Asset title:', assetTitle);

    const maybeDoc = populatedPayment as unknown as {
      toObject?: () => unknown;
    };
    const invoicePayload = maybeDoc.toObject
      ? (maybeDoc.toObject() as PaymentForInvoice)
      : (populatedPayment as unknown as PaymentForInvoice);

    try {
      console.warn('Calling sendIndividualPaymentInvoiceEmail...');
      await sendIndividualPaymentInvoiceEmail(invoicePayload);
      console.warn('Invoice email sent successfully for payment:', payment._id);
    } catch (error) {
      console.error('Failed to send individual payment invoice email:', error);
      console.error(
        'Error details:',
        error instanceof Error ? error.stack : error
      );
    }
  } else {
    console.warn('Could not populate payment for invoice email');
  }

  return payment;
};

const handlePaymentIntentEvent = async (
  paymentIntent: Stripe.PaymentIntent
) => {
  const metadata = paymentIntent.metadata;

  if (!metadata?.paymentType || metadata.paymentType !== 'individual_asset') {
    return; // Not an individual payment, skip
  }

  // Find payment by payment intent ID
  const payment = await IndividualPayment.findOne({
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!payment) {
    return; // Payment record not found, might be handled by checkout.session.completed
  }

  // Update status based on payment intent status
  if (paymentIntent.status === 'succeeded') {
    payment.paymentStatus = 'completed';
    payment.transactionDate = new Date();
  } else if (paymentIntent.status === 'canceled') {
    payment.paymentStatus = 'failed';
  }

  await payment.save();
  return payment;
};

const processIndividualPaymentWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutSessionCompletedEvent(
        event.data.object as Stripe.Checkout.Session
      );
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled':
      return handlePaymentIntentEvent(
        event.data.object as Stripe.PaymentIntent
      );
    default:
      return null;
  }
};

export {
  createCheckoutSessionHandler,
  verifyCheckoutSessionHandler,
  getPaymentHistoryHandler,
  checkAssetPurchaseHandler,
  processIndividualPaymentWebhook,
  processPaymentEarnings,
};
