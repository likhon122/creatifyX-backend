import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import httpStatus from '../../constant/httpStatus';
import {
  addAuthorReplyIntoDB,
  createReviewIntoDB,
  deleteReviewFromDB,
  getReviewByIdFromDB,
  getReviewsByAssetIdFromDB,
  getReviewsForAuthorFromDB,
} from './review.service';

const getReviewsByAssetId = catchAsync(async (req: Request, res: Response) => {
  const { assetId } = req.params;

  const result = await getReviewsByAssetIdFromDB(assetId);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result,
  });
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;

  const result = await getReviewByIdFromDB(reviewId);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review retrieved successfully',
    data: result,
  });
});

const createReview = catchAsync(async (req: Request, res: Response) => {
  const buyerId = req.user?.userId;

  const result = await createReviewIntoDB({
    ...req.body,
    buyerId,
  });

  successResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review created successfully',
    data: result,
  });
});

const addAuthorReply = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const authorId = req.user?.userId;

  const result = await addAuthorReplyIntoDB({
    reviewId,
    authorId,
    comment: req.body.comment,
  });

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reply added successfully',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;

  await deleteReviewFromDB(reviewId);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review deleted successfully',
    data: {},
  });
});

const getAuthorReviews = catchAsync(async (req: Request, res: Response) => {
  const authorId = req.user?.userId;

  const result = await getReviewsForAuthorFromDB(authorId);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Author reviews retrieved successfully',
    data: result,
  });
});

export {
  getReviewsByAssetId,
  getReviewById,
  createReview,
  addAuthorReply,
  deleteReview,
  getAuthorReviews,
};
