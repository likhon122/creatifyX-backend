import z from 'zod';
import { assetOrientations, assetStatus, assetTypes } from './asset.constant';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const csvToArray = (val: unknown) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string')
    return val
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  return [] as string[];
};

const boolFromString = (val: unknown) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true' || val === '1';
  return undefined;
};

const storageSchema = z.object({
  public_id: z.string().min(1),
  secure_url: z.string().url(),
  resource_type: z.enum(['image', 'video', 'raw']),
  format: z.string().min(1),
  bytes: z.number().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const thumbnailSchema = z.object({
  public_id: z.string().min(1),
  secure_url: z.string().url(),
});

const previewsSchema = z.object({
  thumbnail: thumbnailSchema,
  watermark: z.string().optional(),
});

// Create schema
const createAssetValidationSchema = z
  .object({
    body: z
      .object({
        title: z.preprocess(
          v => (typeof v === 'string' ? v.trim() : v),
          z
            .string()
            .min(3)
            .max(200)
            .regex(/^[A-Za-z0-9 ]+$/, {
              message: 'Title must contain only letters, numbers and spaces',
            })
        ),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .optional(),
        assetType: z.enum([
          assetTypes.image,
          assetTypes.video,
          assetTypes.web,
          assetTypes.presentation,
          assetTypes.graphic_template,
        ]),
        // categories can be CSV or array of ObjectId strings
        categories: z.array(z.string().min(1)).min(1).max(5),
        // tags can be CSV or array
        tags: z.preprocess(csvToArray, z.array(z.string().min(1).max(50))),
        compatibleTools: z
          .preprocess(csvToArray, z.array(z.string()).optional())
          .optional(),
        resolution: z.string().max(30).optional(),
        orientation: z
          .enum([
            assetOrientations.horizontal,
            assetOrientations.vertical,
            assetOrientations.square,
          ])
          .optional(),
        isPremium: z.preprocess(boolFromString, z.boolean()).optional(),
        isAIGenerated: z.preprocess(boolFromString, z.boolean()).optional(),
        metadata: z.string().regex(objectIdRegex).optional(),
        livePreview: z.string().url().optional(),
        price: z.preprocess(
          val => (typeof val === 'string' ? parseFloat(val) : val),
          z.number().min(0, 'Price cannot be negative')
        ),
        discountPrice: z
          .preprocess(
            val => (typeof val === 'string' ? parseFloat(val) : val),
            z.number().min(0, 'Discount price cannot be negative')
          )
          .optional(),
        // storage & previews are generated server-side after upload; if present validate shape
        storage: storageSchema.optional(),
        previews: previewsSchema.optional(),
      })
      .strict()
      .refine(
        data => {
          if (data.discountPrice !== undefined && data.price !== undefined) {
            return data.discountPrice <= data.price;
          }
          return true;
        },
        {
          message: 'Discount price must be less than or equal to regular price',
          path: ['discountPrice'],
        }
      ),
    // files will be provided by multer and passed through validateRequest; validate presence and types here
    files: z
      .any()
      .refine(
        files => {
          if (!files) return false;
          const f = files as Record<string, Array<{ mimetype?: string }>>;
          const main = f?.file?.[0];
          if (!main) return false;
          const mimetype = (main.mimetype ?? '').toString();

          // Allow images, videos, and ZIP files
          const isImage = mimetype.startsWith('image');
          const isVideo = mimetype.startsWith('video');
          const isZip = [
            'application/zip',
            'application/x-zip-compressed',
            'application/octet-stream',
          ].includes(mimetype);

          if (!isImage && !isVideo && !isZip) return false;

          const previews = f?.preview || [];

          // Images: no previews allowed (auto-generated)
          if (isImage) {
            return previews.length === 0;
          }

          // Videos: optional single video preview
          if (isVideo) {
            if (previews.length === 0) return true; // auto-generated
            if (previews.length === 1) {
              return previews[0].mimetype?.startsWith('video');
            }
            return false; // too many previews
          }

          // ZIP files: must have 1-5 image previews
          if (isZip) {
            if (previews.length < 1 || previews.length > 5) return false;
            return previews.every(p =>
              ['image/jpeg', 'image/jpg', 'image/png'].includes(
                p.mimetype ?? ''
              )
            );
          }

          return true;
        },
        {
          message:
            'Invalid uploaded files. Images: no preview (auto-generated). Videos: optional video preview. ZIP files: 1-5 JPG/PNG previews required.',
        }
      )
      .optional(),
  })
  .refine(
    data => {
      // Check if the uploaded file is a ZIP/raw file
      const files = data.files as Record<string, Array<{ mimetype?: string }>>;
      const main = files?.file?.[0];
      if (!main) return true; // Let other validation handle missing files

      const mimetype = (main.mimetype ?? '').toString();
      const isZip = [
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
      ].includes(mimetype);

      // If ZIP file, livePreview is required
      if (isZip && !data.body.livePreview) {
        return false;
      }

      return true;
    },
    {
      message: 'livePreview URL is required when uploading ZIP/raw files',
      path: ['body', 'livePreview'],
    }
  );

// Update schema - same validations but all fields optional
const updateAssetValidationSchema = z.object({
  body: z.object({
    status: z.enum([
      assetStatus.pending_review,
      assetStatus.approved,
      assetStatus.rejected,
    ]),
  }),
});

export { createAssetValidationSchema, updateAssetValidationSchema };
