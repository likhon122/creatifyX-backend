import z from 'zod';

const incrementViewSchema = z.object({
  body: z.object({
    assetId: z.string().min(1, 'Asset ID is required'),
  }),
});

const toggleLikeSchema = z.object({
  body: z.object({
    assetId: z.string().min(1, 'Asset ID is required'),
  }),
});

const recordDownloadSchema = z.object({
  body: z.object({
    assetId: z.string().min(1, 'Asset ID is required'),
  }),
});

const getStatsSchema = z.object({
  params: z.object({
    assetId: z.string().min(1, 'Asset ID is required'),
  }),
});

export {
  incrementViewSchema,
  toggleLikeSchema,
  recordDownloadSchema,
  getStatsSchema,
};
