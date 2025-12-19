import z from 'zod';

const nestedFilterValueSchema = z.object({
  displayName: z.string().nonempty({ message: 'Display name is required' }),
  filterKey: z.string().nonempty({ message: 'Filter key is required' }),
});

const availableFilterSchema = z.object({
  filterKey: z
    .string()
    .min(2)
    .max(50)
    .nonempty({ message: 'Filter key is required' }),
  displayName: z
    .string()
    .min(2)
    .max(50)
    .nonempty({ message: 'Display name is required' }),
  options: z.array(
    z.object({
      displayName: z.string().nonempty({ message: 'Display name is required' }),
      value: z.union([z.string(), z.array(nestedFilterValueSchema)]),
    })
  ),
});

const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(50),
    slug: z.string().min(2).max(100).optional(),
    parentCategory: z.boolean().optional(),
    subCategories: z.array(z.string()).optional(),
    availableFilters: z.array(availableFilterSchema).optional(),
  }),
});

const updateAvailableFilterSchema = z.object({
  filterKey: z
    .string()
    .min(2)
    .max(50)
    .nonempty({ message: 'Filter key is required' })
    .optional(),
  displayName: z.string().min(2).max(50).optional(),
  options: z
    .array(
      z.object({
        displayName: z
          .string()
          .nonempty({ message: 'Display name is required' })
          .optional(),
        value: z
          .union([z.string(), z.array(nestedFilterValueSchema)])
          .optional(),
      })
    )
    .optional(),
});

const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(50).optional(),
    slug: z.string().min(2).max(100).optional(),
    parentCategory: z.boolean().optional(),
    subCategories: z.array(z.string()).optional(),
    availableFilters: z.array(updateAvailableFilterSchema).optional(),
  }),
});

export { createCategoryValidationSchema, updateCategoryValidationSchema };
