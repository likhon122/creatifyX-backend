import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import httpStatus from '../../constant/httpStatus';
import {
  addAdminReplyIntoDB,
  createContactIntoDB,
  deleteContactFromDB,
  getContactByIdFromDB,
  getContactsFromDB,
  getContactStatsFromDB,
  updateContactStatusInDB,
} from './contact.service';

const createContact = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await createContactIntoDB({
    ...req.body,
    userId,
  });

  successResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message:
      'Contact message sent successfully. Our team will respond shortly.',
    data: result,
  });
});

const addAdminReply = catchAsync(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const adminId = req.user?.userId;

  const result = await addAdminReplyIntoDB({
    contactId,
    adminId,
    message: req.body.message,
  });

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reply sent successfully. User has been notified via email.',
    data: result,
  });
});

const getContacts = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  const result = await getContactsFromDB(req.query, userId, userRole);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contacts retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getContactById = catchAsync(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  const result = await getContactByIdFromDB(contactId, userId, userRole);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contact retrieved successfully',
    data: result,
  });
});

const updateContactStatus = catchAsync(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const { status } = req.body;

  const result = await updateContactStatusInDB(contactId, status);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contact status updated successfully',
    data: result,
  });
});

const deleteContact = catchAsync(async (req: Request, res: Response) => {
  const { contactId } = req.params;

  await deleteContactFromDB(contactId);

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contact deleted successfully',
    data: {},
  });
});

const getContactStats = catchAsync(async (req: Request, res: Response) => {
  const result = await getContactStatsFromDB();

  successResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contact statistics retrieved successfully',
    data: result,
  });
});

export {
  createContact,
  addAdminReply,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats,
};
