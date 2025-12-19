import { Types } from 'mongoose';

export type TAssetStatus = 'pending_review' | 'approved' | 'rejected';
export type TAssetStorage = {
  public_id: string;
  secure_url: string;
  original_url?: string; // Original unwatermarked file for downloads
  resource_type: 'image' | 'video' | 'raw';
  format: string;
  bytes: number;
  width?: number;
  height?: number;
};

export type TAssetPreviews = {
  thumbnail: { public_id: string; secure_url: string };
  watermark?: string;
  images?: Array<{ public_id: string; secure_url: string }>; // For multiple preview images (ZIP files)
};

export type TAssetType =
  | 'image'
  | 'video'
  | 'web'
  | 'presentation'
  | 'graphic-template';

export type TAssetOrientation = 'horizontal' | 'vertical' | 'square';

export type TAssetStats = { downloads: number; views: number; likes: number };

export type TAssetStatsPopulated = {
  downloads: number;
  views: number;
  likes: number;
  likedBy: Types.ObjectId[];
  downloadedBy: Types.ObjectId[];
};

export type TAsset = {
  title: string;
  slug: string;
  author: Types.ObjectId;
  status: TAssetStatus;
  storage: TAssetStorage;
  previews: TAssetPreviews;
  assetType: TAssetType;
  categories: string[];
  tags: string[];
  compatibleTools?: string[];
  resolution?: string;
  orientation?: TAssetOrientation;
  assetStats?: Types.ObjectId;
  isPremium: boolean;
  isAIGenerated: boolean;
  metadata: Types.ObjectId;
  livePreview?: string;
  price: number;
  discountPrice?: number;
};

export type CreateAssetInput = {
  title: string;
  slug?: string;
  author?: string | Types.ObjectId;
  assetType: TAsset['assetType'];
  categories?: string[] | Types.ObjectId[];
  tags?: string[];
  compatibleTools?: string[];
  resolution?: string;
  orientation?: TAsset['orientation'];
  isPremium?: boolean;
  isAIGenerated?: boolean;
  metadata?: Types.ObjectId | string;
  livePreview?: string;
  price: number;
  discountPrice?: number;
  storage?: {
    public_id: string;
    secure_url: string;
    resource_type: 'image' | 'video' | 'raw';
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
  };
  previews?: {
    thumbnail: { public_id: string; secure_url: string };
    watermark?: string;
  };
};

export type MulterFiles = {
  mainFilePath: string;
  previewFilePaths?: string[]; // Support multiple preview files
  watermarkFilePath?: string;
  mimetype?: string;
};
