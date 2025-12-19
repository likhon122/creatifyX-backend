import { Schema, model } from 'mongoose';
import { TSubscription } from './subscription.interface';
import { subscriptionStatus } from './subscription.constant';

const subscriptionSchema = new Schema<TSubscription>(
  {
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      sparse: true,
    },
    status: {
      type: String,
      enum: [
        subscriptionStatus.active,
        subscriptionStatus.canceled,
        subscriptionStatus.expired,
      ],
      required: true,
    },
    stripeCustomerId: {
      type: String,
      required: [true, 'Stripe Customer ID is required'],
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: [true, 'Stripe Subscription ID is required'],
      unique: true,
    },

    currentPeriodStart: {
      type: Date,
      required: [true, 'Current Period Start is required'],
    },
    currentPeriodEnd: {
      type: Date,
      required: [true, 'Current Period End is required'],
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ user: 1 }, { unique: true, sparse: true });

export const Subscription = model<TSubscription>(
  'Subscription',
  subscriptionSchema
);
