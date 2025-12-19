import { Router } from 'express';
import {
  createContactSchema,
  adminReplySchema,
  getContactsSchema,
  getContactByIdSchema,
  updateContactStatusSchema,
  deleteContactSchema,
} from './contact.validation';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import {
  createContact,
  addAdminReply,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats,
} from './contact.controller';

const router = Router();

// Stats route - Admin only (must be before /:contactId route)
router.get('/stats/overview', auth('admin', 'super_admin'), getContactStats);

// Get all contacts - Authenticated users (see their own), Admins (see all)
router.get(
  '/',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(getContactsSchema),
  getContacts
);

// Get single contact by ID - Contact owner or Admin
router.get(
  '/:contactId',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(getContactByIdSchema),
  getContactById
);

// Create new contact - Subscribers and Authors only
router.post(
  '/',
  auth('subscriber', 'author'),
  validateRequest(createContactSchema),
  createContact
);

// Admin reply to contact - Admin only
router.post(
  '/:contactId/reply',
  auth('admin', 'super_admin'),
  validateRequest(adminReplySchema),
  addAdminReply
);

// Update contact status - Admin only
router.patch(
  '/:contactId/status',
  auth('admin', 'super_admin'),
  validateRequest(updateContactStatusSchema),
  updateContactStatus
);

// Delete contact - Admin only
router.delete(
  '/:contactId',
  auth('admin', 'super_admin'),
  validateRequest(deleteContactSchema),
  deleteContact
);

export const ContactRoutes = router;
