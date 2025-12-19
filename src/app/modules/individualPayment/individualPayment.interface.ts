import { Types } from 'mongoose';

export type TPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type TIndividualPayment = {
  user: Types.ObjectId;
  asset: Types.ObjectId;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  isPremiumUser: boolean;
  paymentStatus: TPaymentStatus;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentMethod?: string;
  transactionDate: Date;
  refundDate?: Date;
  refundReason?: string;
};

export type CreateIndividualPaymentInput = {
  user: string | Types.ObjectId;
  asset: string | Types.ObjectId;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  isPremiumUser: boolean;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentMethod?: string;
};
