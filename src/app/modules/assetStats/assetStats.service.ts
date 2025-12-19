import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { Asset } from '../asset/asset.model';
import { AssetStats } from './assetStats.model';
import { Types } from 'mongoose';
import {
  TIncrementViewInput,
  TToggleLikeInput,
  TRecordDownloadInput,
  TAssetStatsResponse,
  TDownloadResponse,
} from './assetStats.interface';
import { IndividualPayment } from '../individualPayment/individualPayment.model';
import { Response } from 'express';
import { createZipDownload, FileToZip } from '../../utils/zipDownload';

const incrementViewIntoDB = async (
  payload: TIncrementViewInput
): Promise<TAssetStatsResponse> => {
  const { assetId } = payload;

  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Find or create stats document
  let stats = await AssetStats.findOne({ asset: assetId });

  if (!stats) {
    stats = await AssetStats.create({
      asset: assetId,
      views: 1,
      downloads: 0,
      likes: 0,
      likedBy: [],
      downloadedBy: [],
    });

    // Link the AssetStats to the Asset
    await Asset.findByIdAndUpdate(assetId, {
      assetStats: stats._id,
    });
  } else {
    stats.views += 1;
    await stats.save();
  }

  return {
    asset: assetId,
    downloads: stats.downloads,
    views: stats.views,
    likes: stats.likes,
  };
};

/**
 * Toggle like for an asset
 * Requires authentication - only registered users can like
 */
const toggleLikeIntoDB = async (
  payload: TToggleLikeInput
): Promise<TAssetStatsResponse> => {
  const { assetId, userId } = payload;

  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Find or create stats document
  let stats = await AssetStats.findOne({ asset: assetId });

  if (!stats) {
    stats = await AssetStats.create({
      asset: assetId,
      views: 0,
      downloads: 0,
      likes: 1,
      likedBy: [new Types.ObjectId(userId)],
      downloadedBy: [],
    });

    // Link the AssetStats to the Asset
    await Asset.findByIdAndUpdate(assetId, {
      assetStats: stats._id,
    });

    return {
      asset: assetId,
      downloads: stats.downloads,
      views: stats.views,
      likes: stats.likes,
      isLikedByUser: true,
    };
  }

  // Check if user already liked
  const userObjectId = new Types.ObjectId(userId);
  const hasLiked = stats.likedBy.some(id => id.equals(userObjectId));

  if (hasLiked) {
    // Unlike - remove user from likedBy array
    stats.likedBy = stats.likedBy.filter(id => !id.equals(userObjectId));
    stats.likes = Math.max(0, stats.likes - 1);
  } else {
    // Like - add user to likedBy array
    stats.likedBy.push(userObjectId);
    stats.likes += 1;
  }

  await stats.save();

  return {
    asset: assetId,
    downloads: stats.downloads,
    views: stats.views,
    likes: stats.likes,
    isLikedByUser: !hasLiked,
  };
};

/**
 * Record download for an asset
 * Requires authentication and user must have purchased the asset
 * Returns the download URL for the original file
 */
const recordDownloadIntoDB = async (
  payload: TRecordDownloadInput
): Promise<TDownloadResponse> => {
  const { assetId, userId } = payload;

  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Check if user has purchased the asset or it's free
  const isFree = !asset.isPremium || asset.price === 0;

  if (!isFree) {
    const hasPurchased = await IndividualPayment.findOne({
      asset: assetId,
      user: userId,
      paymentStatus: 'completed',
    });

    if (!hasPurchased) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You must purchase this asset before downloading'
      );
    }
  }

  // Find or create stats document and increment download count
  let stats = await AssetStats.findOne({ asset: assetId });

  if (!stats) {
    stats = await AssetStats.create({
      asset: assetId,
      views: 0,
      downloads: 1,
      likes: 0,
      likedBy: [],
      downloadedBy: [new Types.ObjectId(userId)],
    });

    // Link the AssetStats to the Asset
    await Asset.findByIdAndUpdate(assetId, {
      assetStats: stats._id,
    });
  } else {
    // Check if user already downloaded
    const userObjectId = new Types.ObjectId(userId);
    const hasDownloaded = stats.downloadedBy.some(id =>
      id.equals(userObjectId)
    );

    if (!hasDownloaded) {
      // First download by this user
      stats.downloadedBy.push(userObjectId);
    }

    // Increment download count (allows multiple downloads)
    stats.downloads += 1;
    await stats.save();
  }

  // Return the original unwatermarked file download URL
  // Use original_url if available (for new uploads), fallback to secure_url for old assets
  const downloadUrl = asset.storage.original_url || asset.storage.secure_url;

  return {
    downloadUrl,
    fileName: `${asset.slug}.${asset.storage.format}`,
    fileSize: asset.storage.bytes,
    format: asset.storage.format,
  };
};

/**
 * Get stats for an asset
 */
const getAssetStatsFromDB = async (
  assetId: string,
  userId?: string
): Promise<TAssetStatsResponse> => {
  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Find or create stats document
  let stats = await AssetStats.findOne({ asset: assetId });

  if (!stats) {
    stats = await AssetStats.create({
      asset: assetId,
      views: 0,
      downloads: 0,
      likes: 0,
      likedBy: [],
      downloadedBy: [],
    });

    // Link the AssetStats to the Asset
    await Asset.findByIdAndUpdate(assetId, {
      assetStats: stats._id,
    });
  }

  const response: TAssetStatsResponse = {
    asset: assetId,
    downloads: stats.downloads,
    views: stats.views,
    likes: stats.likes,
  };

  // If user is authenticated, check if they liked/downloaded
  if (userId) {
    const userObjectId = new Types.ObjectId(userId);
    response.isLikedByUser = stats.likedBy.some(id => id.equals(userObjectId));
    response.isDownloadedByUser = stats.downloadedBy.some(id =>
      id.equals(userObjectId)
    );
  }

  return response;
};

/**
 * Get detailed stats for an asset with populated user data
 * This is for admin/debugging purposes
 */
const getDetailedAssetStatsFromDB = async (assetId: string) => {
  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Find stats document and populate user data
  const stats = await AssetStats.findOne({ asset: assetId })
    .populate({
      path: 'likedBy',
      select: 'name email profileImage',
    })
    .populate({
      path: 'downloadedBy',
      select: 'name email profileImage',
    });

  if (!stats) {
    throw new AppError(httpStatus.NOT_FOUND, 'Stats not found for this asset');
  }

  return stats;
};

/**
 * Download asset as zip file (includes all original files)
 */
const downloadAssetAsZip = async (
  assetId: string,
  userId: string,
  res: Response
): Promise<void> => {
  // Check if asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  // Check if user has purchased the asset or it's free
  const isFree = !asset.isPremium || asset.price === 0;

  if (!isFree) {
    const hasPurchased = await IndividualPayment.findOne({
      asset: assetId,
      user: userId,
      paymentStatus: 'completed',
    });

    if (!hasPurchased) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You must purchase this asset before downloading'
      );
    }
  }

  // Update download stats
  let stats = await AssetStats.findOne({ asset: assetId });

  if (!stats) {
    stats = await AssetStats.create({
      asset: assetId,
      views: 0,
      downloads: 1,
      likes: 0,
      likedBy: [],
      downloadedBy: [new Types.ObjectId(userId)],
    });

    await Asset.findByIdAndUpdate(assetId, {
      assetStats: stats._id,
    });
  } else {
    const userObjectId = new Types.ObjectId(userId);
    const hasDownloaded = stats.downloadedBy.some(id =>
      id.equals(userObjectId)
    );

    if (!hasDownloaded) {
      stats.downloadedBy.push(userObjectId);
    }

    stats.downloads += 1;
    await stats.save();
  }

  // Prepare files for zip
  const filesToZip: FileToZip[] = [];

  // Add main file (original unwatermarked version)
  const mainFileUrl = asset.storage.original_url || asset.storage.secure_url;
  filesToZip.push({
    url: mainFileUrl,
    filename: `${asset.slug}.${asset.storage.format}`,
  });

  // Add preview images if they exist (for ZIP uploads with multiple images)
  if (asset.previews?.images && asset.previews.images.length > 0) {
    asset.previews.images.forEach((preview, index) => {
      filesToZip.push({
        url: preview.secure_url,
        filename: `preview_${index + 1}.jpg`,
      });
    });
  }

  // Create and stream the zip file
  const zipFilename = `${asset.slug}_${Date.now()}.zip`;
  await createZipDownload(res, filesToZip, zipFilename);
};

export const AssetStatsService = {
  incrementViewIntoDB,
  toggleLikeIntoDB,
  recordDownloadIntoDB,
  getAssetStatsFromDB,
  getDetailedAssetStatsFromDB,
  downloadAssetAsZip,
};
