import fs from 'fs/promises';
import imageSize from 'image-size';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import extractMetadata from '../../utils/extractMetadata';

const MB = 1024 * 1024;
const KB = 1024;

const IMAGE_RULES = {
  maxBytes: 10 * MB,
  minMegapixels: 4,
  maxMegapixels: 25,
};

const VIDEO_RULES = {
  minBytes: 2 * MB,
  maxBytes: 500 * MB,
  minDuration: 5, // seconds
  maxDuration: 300, // 5 minutes
};

const VIDEO_PREVIEW_RULES = {
  maxDuration: 15, // seconds
};

const ZIP_RULES = {
  maxBytes: 500 * MB,
  allowedMimeTypes: [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ],
};

const PREVIEW_IMAGE_RULES = {
  minBytes: 500 * KB, // 500KB
  maxBytes: 5 * MB, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  minCount: 1,
  maxCount: 5,
};

type FileWithPath = Express.Multer.File & { path: string };

export type FileMetadata = {
  bytes: number;
  duration?: number;
  width?: number;
  height?: number;
};

type ValidationResult = {
  resourceType: 'image' | 'video' | 'raw';
  main: FileMetadata;
  preview?: FileMetadata;
};

const ensureFilePath = (file?: Express.Multer.File): FileWithPath => {
  const fileWithPath = file as FileWithPath | undefined;
  if (!fileWithPath || !fileWithPath.path) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Uploaded file is missing a valid path reference'
    );
  }
  return fileWithPath;
};

const resolveFileSize = async (file: FileWithPath): Promise<number> => {
  const sizeFromMul =
    typeof file.size === 'number' && file.size > 0 ? file.size : undefined;
  if (sizeFromMul) return sizeFromMul;
  const stat = await fs.stat(file.path);
  return stat.size;
};

const collectMetadata = async (file: FileWithPath): Promise<FileMetadata> => {
  const raw = await extractMetadata(file.path, file.mimetype);

  let bytes = raw.bytes;
  if (typeof bytes !== 'number') {
    bytes = await resolveFileSize(file);
  }

  const metadata: FileMetadata = {
    bytes,
    duration: raw.duration,
    width: raw.width,
    height: raw.height,
  };

  if (
    file.mimetype?.startsWith('image') &&
    (!metadata.width || !metadata.height)
  ) {
    try {
      const buffer = await fs.readFile(file.path);
      const dims = imageSize(buffer);
      if (dims?.width) metadata.width = dims.width;
      if (dims?.height) metadata.height = dims.height;
    } catch {
      // ignore failures from image-size; we will validate presence later
    }
  }

  return metadata;
};

const ensureRange = (
  value: number,
  { min, max }: { min?: number; max?: number },
  message: string
) => {
  if (typeof value !== 'number') {
    throw new AppError(httpStatus.BAD_REQUEST, message);
  }

  if (
    (typeof min === 'number' && value < min) ||
    (typeof max === 'number' && value > max)
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, message);
  }
};

export const validateAssetUploads = async (
  mainFile: Express.Multer.File | undefined,
  previewFiles?: Express.Multer.File[]
): Promise<ValidationResult> => {
  const ensuredMain = ensureFilePath(mainFile);
  const mainMimetype = ensuredMain.mimetype ?? '';
  const isVideo = mainMimetype.startsWith('video');
  const isImage = mainMimetype.startsWith('image');
  const isZip = ZIP_RULES.allowedMimeTypes.includes(mainMimetype);

  const resourceType: ValidationResult['resourceType'] = isVideo
    ? 'video'
    : isImage
    ? 'image'
    : 'raw';

  const main = await collectMetadata(ensuredMain);

  let preview: FileMetadata | undefined;

  // Handle ZIP files (project files)
  if (isZip) {
    ensureRange(
      main.bytes,
      { max: ZIP_RULES.maxBytes },
      'ZIP files must be 500MB or smaller.'
    );

    // ZIP files MUST have preview images
    if (!previewFiles || previewFiles.length < PREVIEW_IMAGE_RULES.minCount) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `At least ${PREVIEW_IMAGE_RULES.minCount} preview image is required for ZIP files.`
      );
    }

    if (previewFiles.length > PREVIEW_IMAGE_RULES.maxCount) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Maximum ${PREVIEW_IMAGE_RULES.maxCount} preview images are allowed.`
      );
    }

    // Validate each preview image
    for (const previewFile of previewFiles) {
      const ensuredPreview = ensureFilePath(previewFile);

      if (
        !PREVIEW_IMAGE_RULES.allowedMimeTypes.includes(
          ensuredPreview.mimetype ?? ''
        )
      ) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Preview images must be in JPG or PNG format.'
        );
      }

      const previewSize = await resolveFileSize(ensuredPreview);
      ensureRange(
        previewSize,
        {
          min: PREVIEW_IMAGE_RULES.minBytes,
          max: PREVIEW_IMAGE_RULES.maxBytes,
        },
        'Each preview image must be between 500KB and 5MB.'
      );
    }

    return { resourceType, main, preview };
  }

  if (isVideo) {
    ensureRange(
      main.bytes,
      { min: VIDEO_RULES.minBytes, max: VIDEO_RULES.maxBytes },
      'Video files must be between 30MB and 500MB.'
    );

    const duration = main.duration;
    if (typeof duration !== 'number') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Unable to detect video duration for the main file'
      );
    }
    ensureRange(
      duration,
      { min: VIDEO_RULES.minDuration, max: VIDEO_RULES.maxDuration },
      'Video length must be between 5 seconds and 5 minutes.'
    );

    if (previewFiles && previewFiles.length > 0) {
      const previewFile = previewFiles[0];
      const ensuredPreview = ensureFilePath(previewFile);
      if (!ensuredPreview.mimetype?.startsWith('video')) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Preview must be uploaded as a video when the main file is a video.'
        );
      }
      preview = await collectMetadata(ensuredPreview);
      const previewDuration = preview.duration;
      if (typeof previewDuration !== 'number') {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Unable to detect preview video duration.'
        );
      }
      ensureRange(
        previewDuration,
        { max: VIDEO_PREVIEW_RULES.maxDuration },
        'Preview video must be 15 seconds or shorter.'
      );
    }
  }

  if (isImage) {
    ensureRange(
      main.bytes,
      { max: IMAGE_RULES.maxBytes },
      'Image files must be 10MB or smaller.'
    );

    if (typeof main.width !== 'number' || typeof main.height !== 'number') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Unable to detect image dimensions for the main file.'
      );
    }

    const megapixels = (main.width * main.height) / 1_000_000;
    ensureRange(
      megapixels,
      {
        min: IMAGE_RULES.minMegapixels,
        max: IMAGE_RULES.maxMegapixels,
      },
      'Image resolution must be between 4MP and 10MP.'
    );

    if (previewFiles && previewFiles.length > 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Do not upload a preview for images; the server will generate it automatically.'
      );
    }
  }

  return { resourceType, main, preview };
};
