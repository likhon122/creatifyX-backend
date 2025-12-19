import z from 'zod';
import {
  contactCategory,
  contactPriority,
  contactStatus,
} from './contact.constant';

/**
 * Validation schema for creating a contact message
 */
export const createContactSchema = z.object({
  body: z.object({
    subject: z
      .string()
      .min(5, 'Subject must be at least 5 characters')
      .max(200, 'Subject cannot exceed 200 characters')
      .trim(),
    category: z.enum([
      contactCategory.general,
      contactCategory.technical,
      contactCategory.billing,
      contactCategory.feature_request,
      contactCategory.bug_report,
      contactCategory.account,
      contactCategory.other,
    ]),
    priority: z
      .enum([
        contactPriority.low,
        contactPriority.medium,
        contactPriority.high,
        contactPriority.urgent,
      ])
      .optional()
      .default(contactPriority.medium),
    message: z
      .string()
      .min(20, 'Message must be at least 20 characters')
      .max(5000, 'Message cannot exceed 5000 characters')
      .trim(),
  }),
});

/**
 * Validation schema for admin reply
 */
export const adminReplySchema = z.object({
  params: z.object({
    contactId: z
      .string()
      .min(1, 'Contact ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format'),
  }),
  body: z.object({
    message: z
      .string()
      .min(10, 'Reply must be at least 10 characters')
      .max(5000, 'Reply cannot exceed 5000 characters')
      .trim(),
  }),
});

/**
 * Validation schema for getting contacts with filters
 */
export const getContactsSchema = z.object({
  query: z.object({
    status: z
      .enum([
        contactStatus.pending,
        contactStatus.replied,
        contactStatus.closed,
      ])
      .optional(),
    category: z
      .enum([
        contactCategory.general,
        contactCategory.technical,
        contactCategory.billing,
        contactCategory.feature_request,
        contactCategory.bug_report,
        contactCategory.account,
        contactCategory.other,
      ])
      .optional(),
    priority: z
      .enum([
        contactPriority.low,
        contactPriority.medium,
        contactPriority.high,
        contactPriority.urgent,
      ])
      .optional(),
    userId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
      .optional(),
    page: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 10)),
    sortBy: z.enum(['createdAt', 'priority', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Validation schema for getting single contact by ID
 */
export const getContactByIdSchema = z.object({
  params: z.object({
    contactId: z
      .string()
      .min(1, 'Contact ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format'),
  }),
});

/**
 * Validation schema for updating contact status
 */
export const updateContactStatusSchema = z.object({
  params: z.object({
    contactId: z
      .string()
      .min(1, 'Contact ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format'),
  }),
  body: z.object({
    status: z.enum([
      contactStatus.pending,
      contactStatus.replied,
      contactStatus.closed,
    ]),
  }),
});

/**
 * Validation schema for deleting contact
 */
export const deleteContactSchema = z.object({
  params: z.object({
    contactId: z
      .string()
      .min(1, 'Contact ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format'),
  }),
});

export const ContactValidation = {
  createContactSchema,
  adminReplySchema,
  getContactsSchema,
  getContactByIdSchema,
  updateContactStatusSchema,
  deleteContactSchema,
};
