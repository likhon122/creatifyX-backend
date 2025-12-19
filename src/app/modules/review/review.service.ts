import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { Asset } from '../asset/asset.model';
import { Review } from './review.model';
import { Subscription } from '../subscription/subscription.model';
import { AssetStats } from '../assetStats/assetStats.model';
import {
  TCreateReviewInput,
  TAuthorReplyInput,
  TReviewResponse,
} from './review.interface';

const createReviewIntoDB = async (
  payload: TCreateReviewInput
): Promise<TReviewResponse> => {
  const { assetId, buyerId, rating, comment } = payload;

  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Check if user has active subscription
  const hasActiveSubscription = await Subscription.findOne({
    user: buyerId,
    status: 'active',
    currentPeriodEnd: { $gte: new Date() },
  });

  // Check if user has downloaded this specific asset
  const assetStats = await AssetStats.findOne({
    asset: assetId,
    downloadedBy: buyerId,
  });

  // User must either have active subscription OR have downloaded this specific asset
  if (!hasActiveSubscription && !assetStats) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You must have an active subscription or have downloaded this asset to leave a review'
    );
  }

  // Check if user already reviewed this asset
  const existingReview = await Review.findOne({
    asset: assetId,
    buyer: buyerId,
  });

  if (existingReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already reviewed this asset'
    );
  }

  // Create review
  const review = await Review.create({
    asset: assetId,
    buyer: buyerId,
    rating,
    comment,
  });

  // Populate and return
  const populatedReview = await Review.findById(review._id)
    .populate('asset', 'title slug')
    .populate('buyer', 'name profileImage')
    .lean();

  return populatedReview as unknown as TReviewResponse;
};

const addAuthorReplyIntoDB = async (
  payload: TAuthorReplyInput
): Promise<TReviewResponse> => {
  const { reviewId, authorId, comment } = payload;

  // Check if review exists and populate asset
  const review = await Review.findById(reviewId).populate('asset');
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Get asset to check author
  const asset = await Asset.findById(review.asset);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Verify the user is the asset author
  if (asset.author.toString() !== authorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the asset author can reply to reviews'
    );
  }

  // Add or update author reply
  review.authorReply = {
    comment,
    repliedAt: new Date(),
  };

  await review.save();

  // Populate and return
  const populatedReview = await Review.findById(review._id)
    .populate('asset', 'title slug')
    .populate('buyer', 'name profileImage')
    .lean();

  return populatedReview as unknown as TReviewResponse;
};

const deleteReviewFromDB = async (reviewId: string): Promise<void> => {
  // Check if review exists
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  await Review.findByIdAndDelete(reviewId);
};

const getReviewsByAssetIdFromDB = async (
  assetId: string
): Promise<TReviewResponse[]> => {
  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Get all reviews for this asset
  const reviews = await Review.find({ asset: assetId })
    .populate('asset', 'title slug')
    .populate('buyer', 'name profileImage')
    .sort({ createdAt: -1 })
    .lean();

  return reviews as unknown as TReviewResponse[];
};

const getReviewByIdFromDB = async (
  reviewId: string
): Promise<TReviewResponse> => {
  const review = await Review.findById(reviewId)
    .populate('asset', 'title slug')
    .populate('buyer', 'name profileImage')
    .lean();

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  return review as unknown as TReviewResponse;
};

const getReviewsForAuthorFromDB = async (
  authorId: string
): Promise<TReviewResponse[]> => {
  // First, get all assets by this author
  const authorAssets = await Asset.find({ author: authorId }).select('_id');
  const assetIds = authorAssets.map(asset => asset._id);

  // Get all reviews for author's assets
  const reviews = await Review.find({ asset: { $in: assetIds } })
    .populate('asset', 'title slug previews')
    .populate('buyer', 'name profileImage email')
    .sort({ createdAt: -1 })
    .lean();

  return reviews as unknown as TReviewResponse[];
};

export {
  createReviewIntoDB,
  addAuthorReplyIntoDB,
  deleteReviewFromDB,
  getReviewsByAssetIdFromDB,
  getReviewByIdFromDB,
  getReviewsForAuthorFromDB,
};
