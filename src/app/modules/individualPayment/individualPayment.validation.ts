import z from 'zod';
import { paymentStatus } from './individualPayment.constant';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const createPaymentValidationSchema = z.object({
  body: z.object({
    assetId: z.string().regex(objectIdRegex, 'Invalid asset ID'),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  }),
});

const verifyCheckoutSessionValidationSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
  }),
});

const getPaymentHistoryValidationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z
      .enum([
        paymentStatus.pending,
        paymentStatus.completed,
        paymentStatus.failed,
        paymentStatus.refunded,
      ])
      .optional(),
  }),
});

export {
  createPaymentValidationSchema,
  verifyCheckoutSessionValidationSchema,
  getPaymentHistoryValidationSchema,
};
