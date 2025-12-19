export type TPlanType = 'individual' | 'team' | 'enterprise';
export type TBillingCycle = 'monthly' | 'yearly';
export type TCurrency = 'USD' | 'BDT';

export type TPlan = {
  name: string;
  slug: string;
  type: TPlanType;
  billingCycle: TBillingCycle;
  price: number;
  currency: TCurrency;
  stripePriceId: string;
  features: string[];
  isActive: boolean;
};

export type TCreatePlanPayload = {
  name: string;
  type: TPlanType;
  billingCycle: TBillingCycle;
  price: number;
  currency: TCurrency;
  stripePriceId?: string;
  features?: string[];
  isActive?: boolean;
};

export type TUpdatePlanPayload = Partial<TCreatePlanPayload>;
