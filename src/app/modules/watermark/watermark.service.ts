import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { Watermark } from './watermark.model';
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCloudName,
} from '../../config';

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
  });
};

const uploadWatermarkHandler = async (filePath: string, userId: string) => {
  // Validate userId
  if (!userId) {
    await fs.unlink(filePath).catch(() => null);
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Authentication required. Please log in again.'
    );
  }

  // Check if Cloudinary is configured
  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    await fs.unlink(filePath).catch(() => null);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cloud storage is not configured. Please contact administrator.'
    );
  }

  configureCloudinary();

  try {
    // Verify file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'File upload failed. The file could not be processed.'
      );
    }

    // Upload watermark to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'clarifyX/watermarks',
      resource_type: 'image',
    });

    if (!result || !result.secure_url) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Cloud upload failed. Please try again later.'
      );
    }

    // Deactivate all existing watermarks
    await Watermark.updateMany({}, { isActive: false });

    // Create new watermark record
    const watermark = await Watermark.create({
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      isActive: true,
      uploadedBy: userId,
    });

    // Clean up temp file
    await fs.unlink(filePath).catch(() => null);

    return watermark;
  } catch (error) {
    // Clean up temp file on error
    await fs.unlink(filePath).catch(() => null);

    // Re-throw AppError as is
    if (error instanceof AppError) {
      throw error;
    }

    // Handle Cloudinary specific errors
    const cloudinaryError = error as { http_code?: number; message?: string };
    if (cloudinaryError.http_code) {
      if (cloudinaryError.http_code === 400) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Invalid image format. Please upload a valid image file (PNG, JPG, GIF, or WebP).'
        );
      }
      if (cloudinaryError.http_code === 413) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'File is too large. Maximum file size is 10MB.'
        );
      }
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to upload watermark. Please try again or contact support.'
    );
  }
};

const getActiveWatermarkHandler = async () => {
  const watermark = await Watermark.findOne({ isActive: true });
  return watermark;
};

const getAllWatermarksHandler = async () => {
  const watermarks = await Watermark.find().sort({ createdAt: -1 });
  return watermarks;
};

const setActiveWatermarkHandler = async (watermarkId: string) => {
  const watermark = await Watermark.findById(watermarkId);

  if (!watermark) {
    throw new AppError(httpStatus.NOT_FOUND, 'Watermark not found');
  }

  // Deactivate all watermarks
  await Watermark.updateMany({}, { isActive: false });

  // Activate selected watermark
  watermark.isActive = true;
  await watermark.save();

  return watermark;
};

const deleteWatermarkHandler = async (watermarkId: string) => {
  configureCloudinary();

  const watermark = await Watermark.findById(watermarkId);

  if (!watermark) {
    throw new AppError(httpStatus.NOT_FOUND, 'Watermark not found');
  }

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(watermark.public_id);

  // Delete from database
  await Watermark.findByIdAndDelete(watermarkId);

  return { message: 'Watermark deleted successfully' };
};

export const WatermarkService = {
  uploadWatermarkHandler,
  getActiveWatermarkHandler,
  getAllWatermarksHandler,
  setActiveWatermarkHandler,
  deleteWatermarkHandler,
};
