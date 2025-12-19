import { Types } from 'mongoose';

export type TSubscriptionStatus = 'active' | 'canceled' | 'expired';

export type TSubscription = {
  plan: Types.ObjectId;
  user?: Types.ObjectId;
  organization?: Types.ObjectId;
  status: TSubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
};
