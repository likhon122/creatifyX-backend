import z from 'zod';

const createReviewSchema = z.object({
  body: z.object({
    assetId: z.string().min(1, 'Asset ID is required'),
    rating: z
      .number()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z
      .string()
      .min(10, 'Comment must be at least 10 characters')
      .max(1000, 'Comment cannot exceed 1000 characters')
      .trim(),
  }),
});

const updateReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    rating: z
      .number()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5')
      .optional(),
    comment: z
      .string()
      .min(10, 'Comment must be at least 10 characters')
      .max(1000, 'Comment cannot exceed 1000 characters')
      .trim()
      .optional(),
  }),
});

const authorReplySchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    comment: z
      .string()
      .min(10, 'Reply must be at least 10 characters')
      .max(1000, 'Reply cannot exceed 1000 characters')
      .trim(),
  }),
});

const deleteReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
});

const getReviewsSchema = z.object({
  query: z.object({
    assetId: z.string().optional(),
    buyerId: z.string().optional(),
    page: z
      .string()
      .transform(val => parseInt(val, 10))
      .optional(),
    limit: z
      .string()
      .transform(val => parseInt(val, 10))
      .optional(),
    sortBy: z.enum(['createdAt', 'rating']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const getReviewByIdSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
});

export {
  createReviewSchema,
  updateReviewSchema,
  authorReplySchema,
  deleteReviewSchema,
  getReviewsSchema,
  getReviewByIdSchema,
};
