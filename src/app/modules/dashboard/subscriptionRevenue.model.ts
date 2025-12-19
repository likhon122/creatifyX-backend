import { Schema, model } from 'mongoose';

export type TSubscriptionRevenue = {
  subscription: Schema.Types.ObjectId;
  plan: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  companyRevenue: number;
  revenueDate: Date;
  stripeSubscriptionId: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const subscriptionRevenueSchema = new Schema<TSubscriptionRevenue>(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: [true, 'Subscription is required'],
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan is required'],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: [true, 'Billing cycle is required'],
    },
    companyRevenue: {
      type: Number,
      required: [true, 'Company revenue is required'],
      min: [0, 'Company revenue cannot be negative'],
    },
    revenueDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: [true, 'Stripe subscription ID is required'],
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
subscriptionRevenueSchema.index({ user: 1, revenueDate: -1 });
subscriptionRevenueSchema.index({ revenueDate: -1 });
subscriptionRevenueSchema.index({ stripeSubscriptionId: 1, revenueDate: -1 });

export const SubscriptionRevenue = model<TSubscriptionRevenue>(
  'SubscriptionRevenue',
  subscriptionRevenueSchema
);
