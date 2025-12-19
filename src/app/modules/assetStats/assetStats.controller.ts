import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import httpStatus from '../../constant/httpStatus';
import { AssetStatsService } from './assetStats.service';

const incrementView = catchAsync(async (req: Request, res: Response) => {
  const result = await AssetStatsService.incrementViewIntoDB(req.body);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'View recorded successfully',
    data: result,
  });
});

const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await AssetStatsService.toggleLikeIntoDB({
    ...req.body,
    userId,
  });

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isLikedByUser
      ? 'Asset liked successfully'
      : 'Asset unliked successfully',
    data: result,
  });
});

const recordDownload = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await AssetStatsService.recordDownloadIntoDB({
    ...req.body,
    userId,
  });

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Download URL generated successfully',
    data: result,
  });
});

const getAssetStats = catchAsync(async (req: Request, res: Response) => {
  const { assetId } = req.params;
  const userId = req.user?.userId;

  const result = await AssetStatsService.getAssetStatsFromDB(assetId, userId);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Asset stats retrieved successfully',
    data: result,
  });
});

const getDetailedAssetStats = catchAsync(
  async (req: Request, res: Response) => {
    const { assetId } = req.params;

    const result = await AssetStatsService.getDetailedAssetStatsFromDB(assetId);

    successResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Detailed asset stats retrieved successfully',
      data: result,
    });
  }
);

const downloadAsZip = catchAsync(async (req: Request, res: Response) => {
  const { assetId } = req.body;
  const userId = req.user?.userId;

  // This will directly stream the zip to the response
  await AssetStatsService.downloadAssetAsZip(assetId, userId, res);
});

export const AssetStatsController = {
  incrementView,
  toggleLike,
  recordDownload,
  getAssetStats,
  getDetailedAssetStats,
  downloadAsZip,
};
