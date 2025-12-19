import { TSubscriptionStatus } from './subscription.interface';

const subscriptionStatus: Record<TSubscriptionStatus, TSubscriptionStatus> = {
  active: 'active',
  canceled: 'canceled',
  expired: 'expired',
} as const;

export { subscriptionStatus };
