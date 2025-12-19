import z from 'zod';
import { subscriptionStatus } from './subscription.constant';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const toDate = (value: unknown) => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return value;
};

const baseSchema = z.object({
  plan: z
    .string()
    .min(1, 'Plan id is required')
    .regex(objectIdRegex, 'Invalid plan id'),
  user: z.string().regex(objectIdRegex, 'Invalid user id').optional(),
  organization: z
    .string()
    .regex(objectIdRegex, 'Invalid organization id')
    .optional(),
  status: z
    .enum([
      subscriptionStatus.active,
      subscriptionStatus.canceled,
      subscriptionStatus.expired,
    ])
    .optional(),
  stripeCustomerId: z.string().min(1, 'Stripe customer id is required'),
  stripeSubscriptionId: z.string().min(1, 'Stripe subscription id is required'),
  currentPeriodStart: z.preprocess(toDate, z.date()),
  currentPeriodEnd: z.preprocess(toDate, z.date()),
  cancelAtPeriodEnd: z
    .preprocess(toBoolean, z.boolean())
    .optional()
    .default(false),
});

const createSubscriptionValidationSchema = z.object({
  body: baseSchema
    .strict()
    .refine(data => data.user || data.organization, {
      message: 'Either user or organization must be provided',
      path: ['user'],
    })
    .refine(data => !(data.user && data.organization), {
      message: 'Provide either user or organization, not both',
      path: ['organization'],
    }),
});

const updateSubscriptionValidationSchema = z.object({
  body: baseSchema.partial().refine(
    data => {
      if (data.user === undefined && data.organization === undefined) {
        return true;
      }
      if (data.user && data.organization) return false;
      return true;
    },
    {
      message: 'Provide either user or organization, not both',
      path: ['organization'],
    }
  ),
});

const createCheckoutSessionValidationSchema = z.object({
  body: z.object({
    planId: z
      .string()
      .min(1, 'Plan id is required')
      .regex(objectIdRegex, 'Invalid plan id'),
    successUrl: z.string().url('Invalid success url').optional(),
    cancelUrl: z.string().url('Invalid cancel url').optional(),
  }),
});

const verifyCheckoutSessionValidationSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1, 'Session id is required'),
  }),
});

export {
  createSubscriptionValidationSchema,
  updateSubscriptionValidationSchema,
  createCheckoutSessionValidationSchema,
  verifyCheckoutSessionValidationSchema,
};
