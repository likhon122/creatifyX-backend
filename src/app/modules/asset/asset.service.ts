import { JwtPayload } from 'jsonwebtoken';
import mongoose, { PipelineStage } from 'mongoose';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { CreateAssetInput, MulterFiles, TAsset } from './asset.interface';
import { Asset } from './asset.model';
import { AssetMetadata } from '../assetMetadata/assetMetadata.model';
import { uploadFileToCloudinary } from '../../utils/cloudinary';
import fs from 'fs/promises';
import path from 'path';

import { Category } from '../category/category.model';
import extractMetadata from '../../utils/extractMetadata';
import { watermarkPublicId } from '../../config';
import { assetStatus } from './asset.constant';
import QueryBuilder from '../../builder/queryBuilder';
import { AssetStats } from '../assetStats/assetStats.model';

const createAssetHandler = async (
  payload: CreateAssetInput,
  user?: JwtPayload,
  files?: MulterFiles
) => {
  // Helper function to cleanup temp files
  const cleanupTempFiles = async () => {
    const filesToClean = [
      files?.mainFilePath,
      ...(files?.previewFilePaths || []),
    ].filter(Boolean) as string[];

    await Promise.all(
      filesToClean.map(filePath => fs.unlink(filePath).catch(() => null))
    );
  };

  const exists = await Asset.findOne({ slug: payload.slug });
  if (exists) {
    await cleanupTempFiles();
    throw new AppError(
      httpStatus.CONFLICT,
      'Asset already exists with this slug'
    );
  }

  // Check categories is exists
  if (!payload.categories || payload.categories.length === 0) {
    await cleanupTempFiles();
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one category is required'
    );
  }

  // Check if all category IDs exist in the database
  const categoryExists = await Category.find({
    _id: { $in: payload.categories },
  });
  if (categoryExists.length !== payload.categories.length) {
    await cleanupTempFiles();
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid category IDs');
  }

  // determine mimetype/resource_type
  const mimetype = files?.mimetype ?? '';
  const isZip = [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ].includes(mimetype);
  const resource_type: 'image' | 'video' | 'raw' = mimetype.startsWith('image')
    ? 'image'
    : mimetype.startsWith('video')
    ? 'video'
    : 'raw';

  // try to extract metadata locally (ffprobe / exif-parser) from the uploaded temp file
  let extracted: {
    resolution?: string;
    duration?: number;
    fileFormat?: string;
    bytes?: number;
    width?: number;
    height?: number;
  } = {};

  if (files?.mainFilePath) {
    try {
      const local = await extractMetadata(files.mainFilePath, mimetype);
      extracted = { ...extracted, ...local };
    } catch {
      // ignore local extraction failures
    }
  }

  // start transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // upload main file
    if (!files?.mainFilePath) {
      await cleanupTempFiles();
      throw new AppError(httpStatus.BAD_REQUEST, 'Main file is required!');
    }

    const autoGenerateVideoPreview =
      resource_type === 'video' &&
      (!files.previewFilePaths || files.previewFilePaths.length === 0);
    const autoGenerateImagePreview = resource_type === 'image';

    const mainUpload = await uploadFileToCloudinary(files.mainFilePath, {
      resource_type,
      generateVideoPreview: autoGenerateVideoPreview,
      generateImagePreview: autoGenerateImagePreview,
      watermarkPublicId,
    });

    // merge Cloudinary-derived metadata...
    const maybeDuration = (mainUpload as unknown as Record<string, unknown>)[
      'duration'
    ];
    const cloudExtracted = {
      fileFormat: mainUpload.format ?? undefined,
      bytes: mainUpload.bytes ?? undefined,
      width: mainUpload.width ?? undefined,
      height: mainUpload.height ?? undefined,
      resolution:
        mainUpload.width && mainUpload.height
          ? `${mainUpload.width}x${mainUpload.height}`
          : undefined,
      duration:
        typeof maybeDuration === 'number' ? Number(maybeDuration) : undefined,
    };

    extracted = {
      fileFormat: extracted.fileFormat ?? cloudExtracted.fileFormat,
      bytes: extracted.bytes ?? cloudExtracted.bytes,
      width: extracted.width ?? cloudExtracted.width,
      height: extracted.height ?? cloudExtracted.height,
      resolution: extracted.resolution ?? cloudExtracted.resolution,
      duration: extracted.duration ?? cloudExtracted.duration,
    };

    // [NEW] Handle multiple preview images or single preview video
    let previewUpload: { public_id: string; secure_url: string } | undefined;
    let previewImages:
      | Array<{ public_id: string; secure_url: string }>
      | undefined;

    // Define watermark transformation (will be used for user-provided previews)
    const previewEager = watermarkPublicId
      ? [
          {
            overlay: `image:${watermarkPublicId}`,
            gravity: 'south_east',
            x: 10,
            y: 10,
          },
        ]
      : undefined;

    // Handle ZIP files with multiple preview images
    if (isZip && files.previewFilePaths && files.previewFilePaths.length > 0) {
      previewImages = [];

      for (const previewPath of files.previewFilePaths) {
        const prev = await uploadFileToCloudinary(previewPath, {
          resource_type: 'image',
          eager: previewEager,
          folder: 'clarifyX/previews',
        });

        if (prev.eager && prev.eager[0] && prev.eager[0].secure_url) {
          previewImages.push({
            public_id: prev.public_id,
            secure_url: prev.eager[0].secure_url as string,
          });
        } else {
          // No watermark, save the original URL
          previewImages.push({
            public_id: prev.public_id,
            secure_url: prev.secure_url,
          });
        }
      }

      // Set the first preview as thumbnail
      if (previewImages.length > 0) {
        previewUpload = previewImages[0];
      }
    } else if (
      files.previewFilePaths &&
      files.previewFilePaths.length > 0 &&
      resource_type === 'video'
    ) {
      // Handle video preview
      const previewPath = files.previewFilePaths[0];

      // Determine if the preview file is an image or video by extension
      const previewExt = path.extname(previewPath).toLowerCase();
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
      const previewResourceType: 'image' | 'video' = videoExtensions.includes(
        previewExt
      )
        ? 'video'
        : 'image';

      if (previewResourceType !== 'video') {
        await cleanupTempFiles();
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Preview must be uploaded as a video when the main file is a video.'
        );
      }

      const prev = await uploadFileToCloudinary(previewPath, {
        resource_type: previewResourceType,
        eager: previewEager,
        folder: 'clarifyX/previews',
      });

      if (prev.eager && prev.eager[0] && prev.eager[0].secure_url) {
        previewUpload = {
          public_id: prev.public_id,
          secure_url: prev.eager[0].secure_url as string,
        };
      } else {
        // No watermark, save the original URL
        previewUpload = {
          public_id: prev.public_id,
          secure_url: prev.secure_url,
        };
      }
    } else if (resource_type === 'video') {
      // Auto-generate video preview
      if (
        mainUpload.eager &&
        mainUpload.eager[0] &&
        mainUpload.eager[0].secure_url
      ) {
        previewUpload = {
          public_id: `${mainUpload.public_id}_preview`,
          secure_url: mainUpload.eager[0].secure_url as string,
        };
      }
    } else if (resource_type === 'image') {
      // Auto-generate image preview
      const eagerPreview = mainUpload.eager?.find(
        entry => typeof entry.secure_url === 'string'
      ) as { secure_url?: string } | undefined;

      if (eagerPreview?.secure_url) {
        previewUpload = {
          public_id: `${mainUpload.public_id}_preview`,
          secure_url: eagerPreview.secure_url,
        };
      } else {
        await cleanupTempFiles();
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to generate preview for the uploaded image.'
        );
      }
    } else if (!isZip) {
      await cleanupTempFiles();
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Preview is required for this asset type'
      );
    }

    // build asset document
    const assetData: Partial<TAsset> = {
      title: payload.title,
      slug: payload.slug,
      author: user?.userId,
      assetType: payload.assetType,
      categories: payload.categories as string[],
      tags: payload.tags,
      compatibleTools: payload.compatibleTools,
      resolution: extracted.resolution,
      orientation: payload.orientation,
      isPremium: payload.isPremium,
      isAIGenerated: payload.isAIGenerated,
      livePreview:
        resource_type === 'video'
          ? previewUpload?.secure_url
          : resource_type === 'image'
          ? previewUpload?.secure_url
          : payload.livePreview,
      price: payload.price,
      discountPrice: payload.discountPrice,
      storage: {
        public_id: mainUpload.public_id,
        secure_url: mainUpload.secure_url, // This is the original file URL from Cloudinary
        original_url: mainUpload.secure_url, // Store original URL for downloads
        resource_type:
          (mainUpload.resource_type as 'image' | 'video' | 'raw') ||
          resource_type,
        format: String(mainUpload.format ?? extracted.fileFormat ?? ''),
        bytes: Number(mainUpload.bytes ?? extracted.bytes ?? 0),
        width: extracted.width,
        height: extracted.height,
      },
      previews: previewUpload
        ? {
            thumbnail: {
              public_id: previewUpload.public_id,
              secure_url: previewUpload.secure_url,
            },
            watermark: watermarkPublicId ?? '',
            images: previewImages, // Multiple preview images for ZIP files
          }
        : undefined,
    };

    // create a asset
    const [createdAsset] = await Asset.create([assetData], { session });

    // create metadata doc referencing the created asset
    const metadataDoc = {
      asset: createdAsset._id,
      extracted: {
        resolution: extracted.resolution,
        duration: extracted.duration,
        fileFormat: extracted.fileFormat,
      },
      aiGenerated: null,
      manualKeywords: payload.tags,
    } as unknown;

    // Create metadata document
    const createdMetadata = await AssetMetadata.create([metadataDoc], {
      session,
    });

    // Create AssetStats document
    const [createdStats] = await AssetStats.create(
      [
        {
          asset: createdAsset._id,
          views: 0,
          downloads: 0,
          likes: 0,
          likedBy: [],
          downloadedBy: [],
        },
      ],
      { session }
    );

    // update asset with metadata id and assetStats id
    createdAsset.metadata = createdMetadata[0]._id;
    createdAsset.assetStats = createdStats._id;
    await createdAsset.save({ session });

    // populate metadata and assetStats fields for response
    await createdAsset.populate(['metadata', 'assetStats']);

    // commit transaction
    await session.commitTransaction();
    session.endSession();

    // Double-check cleanup: ensure all temp files are deleted
    await cleanupTempFiles().catch(() => null);

    // Return created asset
    return createdAsset;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    // Cleanup temp files on error
    await cleanupTempFiles().catch(() => null);
    throw error;
  }
};

const updateAssetHandler = async (id: string, payload: Partial<TAsset>) => {
  const isExistAsset = await Asset.findById(id);

  if (!isExistAsset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  if (isExistAsset.status === assetStatus.approved) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot update an approved asset'
    );
  }
  if (isExistAsset.status === assetStatus.rejected) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot update a rejected asset'
    );
  }

  const asset = await Asset.findByIdAndUpdate(
    id,
    {
      status: payload.status,
    },
    { new: true }
  );

  if (!asset) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update asset'
    );
  }

  // Remove the storage details before returning
  asset.storage.public_id = '';
  asset.storage.secure_url = '';

  return asset;
};

const getAssetByIdHandler = async (id: string) => {
  const asset = await Asset.findById(id)
    .populate('assetStats categories')
    .select('-__v');
  if (!asset) {
    throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  asset.storage.public_id = '';
  asset.storage.secure_url = '';

  if (asset.storage.public_id !== '' || asset.storage.secure_url !== '') {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to sanitize asset storage details. Please Report this issue.'
    );
  }

  return asset;
};

const getAllAssetsHandler = async (params: Record<string, unknown> = {}) => {
  const builder = new QueryBuilder(params);

  builder
    .search([
      'title',
      'slug',
      'tags',
      'assetType',
      'resolution',
      'metadata.manualKeywords',
      'metadata.aiGenerated.keywords',
      'metadata.aiGenerated.description',
    ])
    .filterExact('assetType', 'assetType')
    .filterExact('orientation', 'orientation')
    .filterExact('status', 'status')
    .filterExact('resolution', 'resolution', { lower: false })
    .filterExact('resourceType', 'storage.resource_type')
    .filterBoolean('isPremium', 'isPremium')
    .filterBoolean('isAIGenerated', 'isAIGenerated')
    .filterObjectId('author', 'author')
    .filterObjectIdArray('categories', 'categories')
    .filterArray('tags', 'tags')
    .filterArray('compatibleTools', 'compatibleTools', 'in')
    .range('price', 'minPrice', 'maxPrice')
    .metadataKeywords('keywords')
    .metadataKeywords('keyword')
    .metadataColors('colors')
    .range('storage.bytes', 'minSize', 'maxSize')
    .range('storage.width', 'minWidth', 'maxWidth')
    .range('storage.height', 'minHeight', 'maxHeight')
    .range('assetStats.downloads', 'minDownloads', 'maxDownloads')
    .range('assetStats.views', 'minViews', 'maxViews')
    .range('assetStats.likes', 'minLikes', 'maxLikes')
    .range('metadata.extracted.duration', 'minDuration', 'maxDuration')
    .sort()
    .project()
    .paginate();

  const { resultStages } = builder.build();

  const lookupStages: PipelineStage[] = [
    {
      $lookup: {
        from: AssetMetadata.collection.name,
        localField: 'metadata',
        foreignField: '_id',
        as: 'metadata',
      },
    },
    {
      $unwind: {
        path: '$metadata',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: Category.collection.name,
        localField: 'categories',
        foreignField: '_id',
        as: 'categories',
      },
    },
    {
      $lookup: {
        from: AssetStats.collection.name,
        localField: 'assetStats',
        foreignField: '_id',
        as: 'assetStats',
      },
    },
    {
      $unwind: {
        path: '$assetStats',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const sanitizeStage: PipelineStage = {
    $unset: ['storage.public_id', 'storage.secure_url'],
  };

  const firstStage = resultStages[0];
  const hasMatchStage =
    firstStage && typeof firstStage === 'object' && '$match' in firstStage;

  const matchStage = hasMatchStage
    ? (firstStage as PipelineStage.Match)
    : undefined;
  const postMatchStages = hasMatchStage ? resultStages.slice(1) : resultStages;

  // Check if status is explicitly provided in params
  const hasExplicitStatus = params.status !== undefined;

  // Only filter out pending_review assets if status is not explicitly provided
  const statusFilterStage: PipelineStage | null = hasExplicitStatus
    ? null
    : {
        $match: {
          status: { $ne: assetStatus.pending_review },
        },
      };

  const dataPipeline: PipelineStage[] = [...postMatchStages, sanitizeStage];
  const metaPipeline: PipelineStage[] = [{ $count: 'total' }];

  const facetStage: PipelineStage = {
    $facet: {
      data: dataPipeline,
      meta: metaPipeline,
    } as Record<string, PipelineStage[]>,
  } as unknown as PipelineStage;

  const addFieldsStage: PipelineStage = {
    $addFields: {
      meta: {
        $ifNull: [{ $arrayElemAt: ['$meta', 0] }, { total: 0 }],
      },
    },
  };

  const facetPipeline: PipelineStage[] = [
    ...lookupStages,
    ...(statusFilterStage ? [statusFilterStage] : []), // Only add status filter if needed
    ...(matchStage ? [matchStage] : []),
    facetStage,
    addFieldsStage,
  ];

  const aggregated = await Asset.aggregate(facetPipeline);
  const facetResult = aggregated[0] ?? { data: [], meta: { total: 0 } };
  const total = (facetResult.meta?.total as number | undefined) ?? 0;
  const meta = builder.buildMeta(total);

  return { data: (facetResult.data as unknown[]) ?? [], meta };
};

const deleteAssetHandler = async (id: string) => {
  // const asset = await Asset.findByIdAndDelete(id);
  // if (!asset) {
  //   throw new AppError(httpStatus.NOT_FOUND, 'Asset not found');
  // }
  return {
    id: id,
    message: 'Delete asset functionality is currently disabled.',
  };
};

export {
  createAssetHandler,
  getAllAssetsHandler,
  getAssetByIdHandler,
  updateAssetHandler,
  deleteAssetHandler,
};
