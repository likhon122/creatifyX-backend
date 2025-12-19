import { Schema, model } from 'mongoose';
import { TAsset } from './asset.interface';
import { assetOrientations, assetStatus, assetTypes } from './asset.constant';

const assetSchema = new Schema<TAsset>(
  {
    title: {
      type: String,
      required: [true, 'Title is required to create asset.'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required to create asset.'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required to create asset.'],
    },
    status: {
      type: String,
      enum: [
        assetStatus.pending_review,
        assetStatus.approved,
        assetStatus.rejected,
      ],
      default: assetStatus.pending_review,
    },

    storage: {
      public_id: { type: String, required: [true, 'Public id is required'] },
      secure_url: { type: String, required: [true, 'Secure url is required'] },
      original_url: { type: String }, // Original unwatermarked file for downloads
      resource_type: {
        type: String,
        enum: ['image', 'video', 'raw'],
        required: [true, 'Resource type is required'],
      },
      format: { type: String, required: [true, 'Format is required'] },
      bytes: { type: Number, required: [true, 'Bytes is required'] },
      width: { type: Number },
      height: { type: Number },
    },
    previews: {
      thumbnail: {
        public_id: {
          type: String,
          required: [true, 'Public id is required for thumbnail'],
        },
        secure_url: {
          type: String,
          required: [true, 'Secure url is required for thumbnail'],
        },
      },
      watermark: { type: String, default: '' },
      images: [
        {
          public_id: { type: String },
          secure_url: { type: String },
        },
      ],
    },

    assetType: {
      type: String,
      enum: [
        assetTypes.image,
        assetTypes.video,
        assetTypes.web,
        assetTypes.presentation,
        assetTypes.graphic_template,
      ],
      required: [true, 'Asset type is required to create asset.'],
      index: true,
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required to create asset.'],
        index: true,
      },
    ],
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
        index: true,
        required: [true, 'At least one tag is required to create asset.'],
      },
    ],
    compatibleTools: [{ type: String, index: true }],
    resolution: { type: String, index: true },
    orientation: {
      type: String,
      enum: [
        assetOrientations.horizontal,
        assetOrientations.vertical,
        assetOrientations.square,
      ],
    },

    assetStats: { type: Schema.Types.ObjectId, ref: 'AssetStats' },
    isPremium: { type: Boolean, default: true },
    isAIGenerated: { type: Boolean, default: false },
    metadata: { type: Schema.Types.ObjectId, ref: 'AssetMetadata' },
    livePreview: { type: String },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
    },
  },
  { timestamps: true }
);

export const Asset = model<TAsset>('Asset', assetSchema);
