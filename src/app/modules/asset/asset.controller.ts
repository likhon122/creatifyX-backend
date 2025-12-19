import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import AppError from '../../errors/appError';
import { JwtPayload } from 'jsonwebtoken';
import {
  createAssetHandler,
  getAllAssetsHandler,
  getAssetByIdHandler,
  updateAssetHandler,
  deleteAssetHandler,
} from './asset.service';
import { CreateAssetInput } from './asset.interface';
import { validateAssetUploads } from './asset.fileValidation';
import fs from 'fs/promises';
import { assetStatus } from './asset.constant';

const createAsset = catchAsync(async (req, res) => {
  const user = req.user;

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const mainFile = files?.file?.[0];
  const previewFiles = files?.preview || [];

  // Helper function to cleanup temp files
  const cleanupTempFiles = async () => {
    const filesToClean = [
      mainFile?.path,
      ...previewFiles.map(f => f.path),
    ].filter(Boolean) as string[];
    await Promise.all(
      filesToClean.map(filePath => fs.unlink(filePath).catch(() => null))
    );
  };

  try {
    if (!mainFile) {
      await cleanupTempFiles();
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Main file is required under field `file`'
      );
    }

    // enforce asset-specific constraints (size, type, length, etc.) before uploading anywhere
    await validateAssetUploads(
      mainFile,
      previewFiles.length > 0 ? previewFiles : undefined
    );

    // normalize body and tags
    const body = req.body || {};
    const tags =
      typeof body.tags === 'string'
        ? body.tags
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : body.tags;

    // construct payload
    const payload: CreateAssetInput = {
      title: body.title,
      slug: body.title.toString().toLowerCase().replace(/ /g, '-'),
      author: user.userId,
      assetType: body.assetType,
      categories: body.categories,
      tags,
      compatibleTools: body.compatibleTools,
      resolution: body.resolution,
      orientation: body.orientation,
      isPremium: body.isPremium === undefined ? true : body.isPremium,
      isAIGenerated:
        body.isAIGenerated === undefined ? false : body.isAIGenerated,
      livePreview: body.livePreview,
      price: body.price,
      discountPrice: body.discountPrice,
    };

    // hand off files and payload to service which will perform uploads, metadata extraction and transactional writes
    const filesToService = {
      mainFilePath: mainFile.path,
      previewFilePaths:
        previewFiles.length > 0 ? previewFiles.map(f => f.path) : undefined,
      mimetype: mainFile.mimetype,
    };

    const result = await createAssetHandler(
      payload,
      user as JwtPayload,
      filesToService
    );

    successResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Asset created successfully',
      data: result,
    });
  } catch (error) {
    // Cleanup temp files on error
    await cleanupTempFiles();
    throw error;
  }
});

const updateAsset = catchAsync(async (req, res) => {
  const asset = await updateAssetHandler(req.params.id, req.body);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Asset updated successfully',
    data: asset,
  });
});

const getSingleAsset = catchAsync(async (req, res) => {
  const asset = await getAssetByIdHandler(req.params.id);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Asset fetched successfully',
    data: asset,
  });
});

const getAllAssets = catchAsync(async (req, res) => {
  const assets = await getAllAssetsHandler(req.query);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Assets fetched successfully',
    data: assets.data,
    meta: assets.meta,
  });
});

const deleteAsset = catchAsync(async (req, res) => {
  const asset = await deleteAssetHandler(req.params.id);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Asset deleted successfully',
    data: asset,
  });
});

const getMyPendingAssets = catchAsync(async (req, res) => {
  const authorId = req.user?.userId;
  const assets = await getAllAssetsHandler({
    ...req.query,
    author: authorId,
    status: 'pending_review',
  });
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Pending assets fetched successfully',
    data: assets.data,
    meta: assets.meta,
  });
});

const getPendingAssets = catchAsync(async (req, res) => {
  const assets = await getAllAssetsHandler({
    ...req.query,
    status: assetStatus.pending_review,
  });
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Pending assets fetched successfully',
    data: assets.data,
    meta: assets.meta,
  });
});

const approveAsset = catchAsync(async (req, res) => {
  const asset = await updateAssetHandler(req.params.id, { status: 'approved' });
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Asset approved successfully',
    data: asset,
  });
});

const rejectAsset = catchAsync(async (req, res) => {
  const asset = await updateAssetHandler(req.params.id, { status: 'rejected' });
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Asset rejected successfully',
    data: asset,
  });
});

export {
  createAsset,
  getAllAssets,
  getSingleAsset,
  updateAsset,
  deleteAsset,
  getMyPendingAssets,
  getPendingAssets,
  approveAsset,
  rejectAsset,
};
