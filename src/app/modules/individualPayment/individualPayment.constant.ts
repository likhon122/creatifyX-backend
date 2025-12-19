import { TPaymentStatus } from './individualPayment.interface';

export const paymentStatus: Record<TPaymentStatus, TPaymentStatus> = {
  pending: 'pending',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded',
} as const;

export const PREMIUM_DISCOUNT_PERCENTAGE = 30;
