import { TSubscriptionStatus } from './subscription.interface';

type CreateCheckoutSessionInput = {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
};

type VerifyCheckoutSessionInput = {
  sessionId: string;
};

type CreateSubscriptionInput = {
  plan: string;
  user?: string;
  organization?: string;
  status?: TSubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
};

type UpdateSubscriptionInput = Partial<CreateSubscriptionInput>;

export {
  CreateCheckoutSessionInput,
  VerifyCheckoutSessionInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
};
