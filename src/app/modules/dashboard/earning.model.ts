import { Schema, model } from 'mongoose';
import { TEarning } from './dashboard.interface';

const earningSchema = new Schema<TEarning>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
      index: true,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'IndividualPayment',
      required: [true, 'Payment is required'],
      index: true,
      unique: true, // One earning record per payment
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer is required'],
      index: true,
    },
    assetPrice: {
      type: Number,
      required: [true, 'Asset price is required'],
      min: [0, 'Asset price cannot be negative'],
    },
    isPremiumBuyer: {
      type: Boolean,
      required: [true, 'Premium buyer status is required'],
      default: false,
    },
    platformFee: {
      type: Number,
      required: [true, 'Platform fee is required'],
      min: [0, 'Platform fee cannot be negative'],
    },
    platformFeePercentage: {
      type: Number,
      required: [true, 'Platform fee percentage is required'],
      min: [0, 'Platform fee percentage cannot be negative'],
      max: [100, 'Platform fee percentage cannot exceed 100'],
    },
    authorEarning: {
      type: Number,
      required: [true, 'Author earning is required'],
      min: [0, 'Author earning cannot be negative'],
    },
    companyEarning: {
      type: Number,
      required: [true, 'Company earning is required'],
      min: [0, 'Company earning cannot be negative'],
    },
    earningDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
earningSchema.index({ author: 1, earningDate: -1 });
earningSchema.index({ asset: 1, earningDate: -1 });
earningSchema.index({ earningDate: -1 });
earningSchema.index({ author: 1, isPremiumBuyer: 1 });

export const Earning = model<TEarning>('Earning', earningSchema);
