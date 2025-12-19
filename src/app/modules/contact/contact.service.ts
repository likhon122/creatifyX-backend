import { PipelineStage, Types } from 'mongoose';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { Contact } from './contact.model';
import { User } from '../user/user.model';
import {
  TCreateContactInput,
  TAdminReplyInput,
  TGetContactsQuery,
  TContactResponse,
} from './contact.interface';
import { contactStatus } from './contact.constant';
import sendContactReplyEmail from '../../utils/email/contactReplyEmail';

const createContactIntoDB = async (
  payload: TCreateContactInput
): Promise<TContactResponse> => {
  const { userId, subject, category, priority, message } = payload;

  // Verify user exists and has appropriate role
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!['subscriber', 'author'].includes(user.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only subscribers and authors can contact support'
    );
  }

  // Create contact message
  const contact = await Contact.create({
    user: userId,
    subject,
    category,
    priority,
    message,
    status: contactStatus.pending,
  });

  // Populate and return
  const populatedContact = await Contact.findById(contact._id)
    .populate('user', 'name email profileImage')
    .lean();

  console.warn(
    `[Contact Created] User ${user.email} created contact ${contact._id}`
  );

  return populatedContact as unknown as TContactResponse;
};

const addAdminReplyIntoDB = async (
  payload: TAdminReplyInput
): Promise<TContactResponse> => {
  const { contactId, adminId, message } = payload;

  // Verify admin exists
  const admin = await User.findById(adminId);
  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');
  }

  if (!['admin', 'super_admin'].includes(admin.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admins can reply to contacts'
    );
  }

  // Find and verify contact exists
  const contact = await Contact.findById(contactId).populate(
    'user',
    'name email'
  );
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact message not found');
  }

  // Check if contact is already closed
  if (contact.status === contactStatus.closed) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot reply to a closed contact'
    );
  }

  // Add admin reply
  contact.adminReply = {
    admin: new Types.ObjectId(adminId),
    message,
    repliedAt: new Date(),
  };
  contact.status = contactStatus.replied;

  await contact.save();

  // Send email notification to user
  try {
    const populatedUser = contact.user as unknown as {
      _id: string;
      name: string;
      email: string;
    };

    await sendContactReplyEmail({
      userName: populatedUser.name,
      userEmail: populatedUser.email,
      subject: contact.subject,
      originalMessage: contact.message,
      adminReply: message,
      adminName: admin.name,
      contactId: contact._id.toString(),
    });

    console.warn(
      `[Contact Reply Email] Sent to ${populatedUser.email} for contact ${contactId}`
    );
  } catch (emailError) {
    console.error('[Contact Reply Email] Failed to send:', emailError);
    // Don't throw error - reply is saved even if email fails
  }

  // Populate and return
  const populatedContact = await Contact.findById(contact._id)
    .populate('user', 'name email profileImage')
    .populate('adminReply.admin', 'name email')
    .lean();

  console.warn(
    `[Contact Replied] Admin ${admin.email} replied to contact ${contactId}`
  );

  return populatedContact as unknown as TContactResponse;
};

const getContactsFromDB = async (
  query: TGetContactsQuery,
  requestUserId?: string,
  requestUserRole?: string
): Promise<{
  data: TContactResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const {
    status,
    category,
    priority,
    userId,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Build match stage
  const matchStage: Record<string, unknown> = {};

  // If not admin, only show user's own contacts
  if (requestUserRole && !['admin', 'super_admin'].includes(requestUserRole)) {
    matchStage.user = new Types.ObjectId(requestUserId);
  } else if (userId) {
    // Admin can filter by specific user
    matchStage.user = new Types.ObjectId(userId);
  }

  if (status) {
    matchStage.status = status;
  }

  if (category) {
    matchStage.category = category;
  }

  if (priority) {
    matchStage.priority = priority;
  }

  // Build sort stage
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortStage: Record<string, 1 | -1> = { [sortBy]: sortDirection };

  // Calculate skip
  const skip = (page - 1) * limit;

  // Build aggregation pipeline
  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    { $sort: sortStage },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: '$user' },
          {
            $lookup: {
              from: 'users',
              localField: 'adminReply.admin',
              foreignField: '_id',
              as: 'adminReply.adminDetails',
            },
          },
          {
            $addFields: {
              'adminReply.admin': {
                $arrayElemAt: ['$adminReply.adminDetails', 0],
              },
            },
          },
          {
            $project: {
              _id: 1,
              user: {
                _id: '$user._id',
                name: '$user.name',
                email: '$user.email',
                profileImage: '$user.profileImage',
              },
              subject: 1,
              category: 1,
              priority: 1,
              message: 1,
              status: 1,
              adminReply: {
                $cond: {
                  if: { $ifNull: ['$adminReply.message', false] },
                  then: {
                    admin: {
                      _id: '$adminReply.admin._id',
                      name: '$adminReply.admin.name',
                      email: '$adminReply.admin.email',
                    },
                    message: '$adminReply.message',
                    repliedAt: '$adminReply.repliedAt',
                  },
                  else: '$$REMOVE',
                },
              },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        meta: [{ $count: 'total' }],
      },
    },
  ];

  const result = await Contact.aggregate(pipeline);

  const data = result[0]?.data || [];
  const total = result[0]?.meta[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

const getContactByIdFromDB = async (
  contactId: string,
  requestUserId?: string,
  requestUserRole?: string
): Promise<TContactResponse> => {
  const contact = await Contact.findById(contactId)
    .populate('user', 'name email profileImage')
    .populate('adminReply.admin', 'name email')
    .lean();

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact message not found');
  }

  // Verify user has permission to view this contact
  const contactUser = contact.user as unknown as { _id: Types.ObjectId };
  if (
    requestUserRole &&
    !['admin', 'super_admin'].includes(requestUserRole) &&
    contactUser._id.toString() !== requestUserId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have permission to view this contact'
    );
  }

  return contact as unknown as TContactResponse;
};

const updateContactStatusInDB = async (
  contactId: string,
  status: 'pending' | 'replied' | 'closed'
): Promise<TContactResponse> => {
  const contact = await Contact.findById(contactId);
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact message not found');
  }

  contact.status = status;
  await contact.save();

  // Populate and return
  const populatedContact = await Contact.findById(contact._id)
    .populate('user', 'name email profileImage')
    .populate('adminReply.admin', 'name email')
    .lean();

  console.warn(
    `[Contact Status Updated] Contact ${contactId} status changed to ${status}`
  );

  return populatedContact as unknown as TContactResponse;
};

const deleteContactFromDB = async (contactId: string): Promise<void> => {
  const contact = await Contact.findById(contactId);
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact message not found');
  }

  await Contact.findByIdAndDelete(contactId);

  console.warn(`[Contact Deleted] Contact ${contactId} deleted`);
};

const getContactStatsFromDB = async (): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}> => {
  const [statusStats, categoryStats, priorityStats, totalCount] =
    await Promise.all([
      Contact.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Contact.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Contact.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Contact.countDocuments(),
    ]);

  const byStatus: Record<string, number> = {};
  statusStats.forEach(stat => {
    byStatus[stat._id] = stat.count;
  });

  const byCategory: Record<string, number> = {};
  categoryStats.forEach(stat => {
    byCategory[stat._id] = stat.count;
  });

  const byPriority: Record<string, number> = {};
  priorityStats.forEach(stat => {
    byPriority[stat._id] = stat.count;
  });

  return {
    total: totalCount,
    byStatus,
    byCategory,
    byPriority,
  };
};

export {
  createContactIntoDB,
  addAdminReplyIntoDB,
  getContactsFromDB,
  getContactByIdFromDB,
  updateContactStatusInDB,
  deleteContactFromDB,
  getContactStatsFromDB,
};
