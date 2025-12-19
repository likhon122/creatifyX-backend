import { Types } from 'mongoose';

export type TAssetStats = {
  asset: Types.ObjectId;
  downloads: number;
  views: number;
  likes: number;
  likedBy: Types.ObjectId[];
  downloadedBy: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type TIncrementViewInput = {
  assetId: string;
};

export type TToggleLikeInput = {
  assetId: string;
  userId: string;
};

export type TRecordDownloadInput = {
  assetId: string;
  userId: string;
};

export type TAssetStatsResponse = {
  asset: string;
  downloads: number;
  views: number;
  likes: number;
  isLikedByUser?: boolean;
  isDownloadedByUser?: boolean;
};

export type TDownloadResponse = {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  format: string;
};
