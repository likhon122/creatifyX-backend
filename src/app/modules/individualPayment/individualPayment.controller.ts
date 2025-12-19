import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import {
  createCheckoutSessionHandler,
  verifyCheckoutSessionHandler,
  getPaymentHistoryHandler,
  checkAssetPurchaseHandler,
} from './individualPayment.service';

const createCheckoutSession = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const { assetId, successUrl, cancelUrl } = req.body;

  const result = await createCheckoutSessionHandler(
    userId,
    assetId,
    successUrl,
    cancelUrl
  );

  successResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Checkout session created successfully',
    data: result,
  });
});

const verifyCheckoutSession = catchAsync(async (req, res) => {
  const { sessionId } = req.body;

  const result = await verifyCheckoutSessionHandler(sessionId);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payment verified successfully',
    data: result,
  });
});

const getPaymentHistory = catchAsync(async (req, res) => {
  const userId = req.user.userId;

  const result = await getPaymentHistoryHandler(userId, req.query);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payment history fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const checkAssetPurchase = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const { assetId } = req.params;

  const result = await checkAssetPurchaseHandler(userId, assetId);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Asset purchase status fetched successfully',
    data: result,
  });
});

export {
  createCheckoutSession,
  verifyCheckoutSession,
  getPaymentHistory,
  checkAssetPurchase,
};
