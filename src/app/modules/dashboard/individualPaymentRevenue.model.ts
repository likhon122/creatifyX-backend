import { Schema, model } from 'mongoose';

export interface TIndividualPaymentRevenue {
  payment: Schema.Types.ObjectId;
  asset: Schema.Types.ObjectId;
  author: Schema.Types.ObjectId;
  buyer: Schema.Types.ObjectId;
  amount: number;
  authorRevenue: number;
  companyRevenue: number;
  isPremiumBuyer: boolean;
  revenueDate: Date;
  stripePaymentIntentId?: string;
}

const individualPaymentRevenueSchema = new Schema<TIndividualPaymentRevenue>(
  {
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'IndividualPayment',
      required: [true, 'Payment is required'],
      index: true,
    },
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    authorRevenue: {
      type: Number,
      required: [true, 'Author revenue is required'],
      min: [0, 'Author revenue cannot be negative'],
    },
    companyRevenue: {
      type: Number,
      required: [true, 'Company revenue is required'],
      min: [0, 'Company revenue cannot be negative'],
    },
    isPremiumBuyer: {
      type: Boolean,
      required: [true, 'Premium buyer status is required'],
      default: false,
    },
    revenueDate: {
      type: Date,
      required: [true, 'Revenue date is required'],
      index: true,
      default: Date.now,
    },
    stripePaymentIntentId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
individualPaymentRevenueSchema.index({ author: 1, revenueDate: 1 });
individualPaymentRevenueSchema.index({ revenueDate: 1 });
individualPaymentRevenueSchema.index({
  stripePaymentIntentId: 1,
  revenueDate: 1,
});

export const IndividualPaymentRevenue = model<TIndividualPaymentRevenue>(
  'IndividualPaymentRevenue',
  individualPaymentRevenueSchema
);
