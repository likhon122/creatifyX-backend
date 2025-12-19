import z from 'zod';
import { billingCycles, currency, planTypes } from './plan.constant';

const createPlanValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Plan name is required'),
    type: z.enum([
      planTypes.individual,
      planTypes.team,
      planTypes.enterprise,
    ] as [string, ...string[]]),
    billingCycle: z.enum([billingCycles.monthly, billingCycles.yearly] as [
      string,
      ...string[]
    ]),
    price: z.number().min(0, 'Price must be a positive number'),
    currency: z.enum([currency.USD, currency.BDT] as [string, ...string[]]),
    // stripePriceId: z.string().min(1, 'Stripe price id is required').optional(),
    features: z.array(z.string()).optional(),
  }),
});

const updatePlanValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Plan ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Plan name is required').optional(),
    type: z
      .enum([planTypes.individual, planTypes.team, planTypes.enterprise] as [
        string,
        ...string[]
      ])
      .optional(),
    billingCycle: z
      .enum([billingCycles.monthly, billingCycles.yearly] as [
        string,
        ...string[]
      ])
      .optional(),
    price: z.number().min(0, 'Price must be a positive number').optional(),
    currency: z
      .enum([currency.USD, currency.BDT] as [string, ...string[]])
      .optional(),
    // stripePriceId: z.string().min(1, 'Stripe price id is required').optional(),
    features: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export { createPlanValidationSchema, updatePlanValidationSchema };
