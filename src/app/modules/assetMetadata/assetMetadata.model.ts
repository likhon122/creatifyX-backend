import { Schema, model } from 'mongoose';
import { TAssetMetadata } from './assetMetaData.interface';

const assetMetadataSchema = new Schema<TAssetMetadata>(
  {
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      unique: true,
    },
    extracted: {
      resolution: { type: String },
      duration: { type: Number },
      fileFormat: { type: String },
    },
    aiGenerated: {
      type: {
        keywords: [{ type: String, lowercase: true, trim: true }],
        description: { type: String },
        dominantColors: [{ type: String }],
      },
      default: null,
    },
    manualKeywords: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true }
);

export const AssetMetadata = model<TAssetMetadata>(
  'AssetMetadata',
  assetMetadataSchema
);
