import { Schema, model } from 'mongoose';
import { TIndividualPayment } from './individualPayment.interface';
import { paymentStatus } from './individualPayment.constant';

const individualPaymentSchema = new Schema<TIndividualPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
      index: true,
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Original price cannot be negative'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    finalPrice: {
      type: Number,
      required: [true, 'Final price is required'],
      min: [0, 'Final price cannot be negative'],
    },
    isPremiumUser: {
      type: Boolean,
      required: [true, 'Premium user status is required'],
      default: false,
    },
    paymentStatus: {
      type: String,
      enum: [
        paymentStatus.pending,
        paymentStatus.completed,
        paymentStatus.failed,
        paymentStatus.refunded,
      ],
      default: paymentStatus.pending,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      index: true,
    },
    stripeSessionId: {
      type: String,
      index: true,
    },
    paymentMethod: {
      type: String,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    refundDate: {
      type: Date,
    },
    refundReason: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
individualPaymentSchema.index({ user: 1, asset: 1 });
individualPaymentSchema.index({ user: 1, paymentStatus: 1 });

export const IndividualPayment = model<TIndividualPayment>(
  'IndividualPayment',
  individualPaymentSchema
);
