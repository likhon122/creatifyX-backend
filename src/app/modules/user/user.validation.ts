import z from 'zod';

const blockUserSchema = z.object({
  body: z.object({
    status: z.enum(['blocked', 'active', 'inactive']),
    message: z.string().min(50).max(1000),
  }),
});

export { blockUserSchema };
