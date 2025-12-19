import { Schema, model } from 'mongoose';
import { TAssetStats } from './assetStats.interface';

const assetStatsSchema = new Schema<TAssetStats>(
  {
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
      unique: true,
      index: true,
    },
    downloads: {
      type: Number,
      default: 0,
      min: [0, 'Downloads cannot be negative'],
    },
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },
    likes: {
      type: Number,
      default: 0,
      min: [0, 'Likes cannot be negative'],
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    downloadedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
assetStatsSchema.index({ asset: 1 });
assetStatsSchema.index({ asset: 1, likedBy: 1 });
assetStatsSchema.index({ asset: 1, downloadedBy: 1 });

export const AssetStats = model<TAssetStats>('AssetStats', assetStatsSchema);
