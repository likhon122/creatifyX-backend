import { Request, Response } from 'express';
import { WatermarkService } from './watermark.service';
import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';

const uploadWatermark = catchAsync(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'No file uploaded. Please select an image file to upload.',
      errorCode: 'NO_FILE',
    });
  }

  // Validate file type
  const allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message:
        'Invalid file type. Only PNG, JPG, GIF, and WebP images are allowed.',
      errorCode: 'INVALID_FILE_TYPE',
    });
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'File is too large. Maximum file size is 5MB.',
      errorCode: 'FILE_TOO_LARGE',
    });
  }

  const result = await WatermarkService.uploadWatermarkHandler(
    file.path,
    req.user?.userId
  );

  res.status(httpStatus.OK).json({
    success: true,
    message:
      'Watermark uploaded successfully! It is now set as the active watermark.',
    data: result,
  });
});

const getActiveWatermark = catchAsync(async (req: Request, res: Response) => {
  const result = await WatermarkService.getActiveWatermarkHandler();

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Active watermark retrieved successfully',
    data: result,
  });
});

const getAllWatermarks = catchAsync(async (req: Request, res: Response) => {
  const result = await WatermarkService.getAllWatermarksHandler();

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Watermarks retrieved successfully',
    data: result,
  });
});

const setActiveWatermark = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await WatermarkService.setActiveWatermarkHandler(id);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Watermark activated successfully',
    data: result,
  });
});

const deleteWatermark = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await WatermarkService.deleteWatermarkHandler(id);

  res.status(httpStatus.OK).json({
    success: true,
    message: result.message,
  });
});

export const WatermarkController = {
  uploadWatermark,
  getActiveWatermark,
  getAllWatermarks,
  setActiveWatermark,
  deleteWatermark,
};
