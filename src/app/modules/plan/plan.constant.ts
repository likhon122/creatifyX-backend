import { TBillingCycle, TCurrency, TPlanType } from './plan.interface';

const planTypes: Record<TPlanType, TPlanType> = {
  individual: 'individual',
  team: 'team',
  enterprise: 'enterprise',
} as const;

const billingCycles: Record<TBillingCycle, TBillingCycle> = {
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

const currency: Record<TCurrency, TCurrency> = {
  USD: 'USD',
  BDT: 'BDT',
} as const;

export { planTypes, billingCycles, currency };
