import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import fs from 'fs/promises';
import httpStatus from '../constant/httpStatus';
import AppError from '../errors/appError';
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCloudName,
} from '../config';

const configure = () => {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
  });
};

export type UploadResult = {
  public_id: string;
  secure_url: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  eager?: Array<Record<string, unknown>>;
};

const uploadFileToCloudinary = async (
  filePath: string,
  opts: {
    resource_type?: 'image' | 'video' | 'raw';
    folder?: string;
    public_id?: string;
    eager?: Array<Record<string, unknown>>;
    watermarkPublicId?: string;
    generateVideoPreview?: boolean;
    generateImagePreview?: boolean;
  } = {}
): Promise<UploadResult> => {
  configure();

  const baseFolder = opts.folder ?? 'clarifyX';
  const subFolder =
    opts.resource_type === 'video'
      ? 'videos'
      : opts.resource_type === 'image'
      ? 'images'
      : 'files';

  const fullFolder = `${baseFolder}/${subFolder}`;

  try {
    const uploadOptions: Record<string, unknown> = {
      folder: fullFolder,
    };

    if (opts.public_id) uploadOptions.public_id = opts.public_id;

    uploadOptions.resource_type = opts.resource_type ?? 'image';

    const eagerArr: Array<Record<string, unknown>> = [];

    // ========== ✅ Video Preview With Watermark ==========
    if (opts.generateVideoPreview && opts.resource_type === 'video') {
      const videoPreview: Record<string, unknown> = {
        resource_type: 'video',
        format: 'mp4',
        start_offset: 0,
        duration: 15,
      };
      if (opts.watermarkPublicId) {
        const overlayPublicId = opts.watermarkPublicId.replace(/\//g, ':');

        videoPreview.transformation = [
          {
            overlay: `image:${overlayPublicId}`,
            gravity: 'south_east',
            x: 10,
            y: 10,
          },
        ];
      }

      eagerArr.push(videoPreview);
    }

    if (opts.generateImagePreview && opts.resource_type === 'image') {
      const imagePreview: Record<string, unknown> = {
        width: 1600,
        height: 1600,
        crop: 'limit',
        quality: 'auto:good',
        format: 'jpg',
      };

      if (opts.watermarkPublicId) {
        const overlayPublicId = opts.watermarkPublicId.replace(/\//g, ':');
        imagePreview.transformation = [
          {
            overlay: `image:${overlayPublicId}`,
            gravity: 'south_east',
            x: 10,
            y: 10,
          },
        ];
      }

      eagerArr.push(imagePreview);
    }

    // ========== ✅ Other eager transforms (like Image Previews) ==========
    if (opts.eager) {
      opts.eager.forEach(e => {
        const entry = { ...e };
        if (typeof entry.overlay === 'string') {
          const fixedOverlayString = entry.overlay.replace(/\//g, ':');

          entry.transformation = [
            {
              overlay: fixedOverlayString, // Use the fixed string
              gravity: entry.gravity,
              x: entry.x,
              y: entry.y,
            },
          ];
          delete entry.overlay;
          delete entry.gravity;
          delete entry.x;
          delete entry.y;
        }

        eagerArr.push(entry);
      });
    }

    if (eagerArr.length) uploadOptions.eager = eagerArr;

    const result = (await cloudinary.uploader.upload(
      filePath,
      uploadOptions
    )) as UploadApiResponse;

    // Always cleanup temp file after successful upload
    await fs.unlink(filePath).catch(() => null);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      eager: result.eager as Array<Record<string, unknown>>,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // Always cleanup temp file on error
    await fs.unlink(filePath).catch(() => null);
    console.error('❌ Cloudinary Upload Error:', err);

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `File upload failed: ${err?.message || 'Unknown error'}`
    );
  }
};

export { uploadFileToCloudinary };
