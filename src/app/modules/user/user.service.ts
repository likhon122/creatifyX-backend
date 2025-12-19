import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { User } from './user.model';
import QueryBuilder from '../../builder/queryBuilder';
import { PipelineStage } from 'mongoose';
import { Organization } from '../organization/organization.model';
import { userStatus } from './user.constant';
import sendEmail from '../../utils/sendEmail';
import {
  accountBlockedEmailTemplate,
  accountInactiveEmailTemplate,
  accountReactivatedEmailTemplate,
} from '../../utils/email/accountStatusEmail';
import { uploadFileToCloudinary } from '../../utils/cloudinary';

const getMeHandler = async (userId: string) => {
  const user = await User.findById(userId).select(
    '-password -resetPasswordToken -resetPasswordExpires -loginOtp'
  );
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const getSingleUserHandler = async (userId: string) => {
  const user = await User.findById(userId).select(
    '-password -resetPasswordToken -resetPasswordExpires -loginOtp -loginOtpExpires -authorVerificationStatus'
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

const getAllUsersHandler = async (params: Record<string, unknown> = {}) => {
  const builder = new QueryBuilder(params);

  builder
    .search(['name', 'email', 'bio'])
    .filterExact('role', 'role')
    .filterExact('status', 'status')
    .filterExact('authorVerificationStatus', 'authorVerificationStatus')
    .filterExact('orgRole', 'orgRole')
    .filterBoolean('isDeleted', 'isDeleted')
    .filterObjectId('organization', 'organization')
    .sort()
    .project()
    .paginate();

  const { resultStages } = builder.build();

  const lookupStages: PipelineStage[] = [
    {
      $lookup: {
        from: Organization.collection.name,
        localField: 'organization',
        foreignField: '_id',
        as: 'organization',
      },
    },
    {
      $unwind: {
        path: '$organization',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const sanitizeStage: PipelineStage = {
    $unset: [
      'password',
      'resetPasswordToken',
      'resetPasswordExpires',
      'passwordResetToken',
      'passwordResetExpires',
      'passwordResetIp',
      'loginOtp',
      'loginOtpExpires',
      '__v',
    ],
  };

  const firstStage = resultStages[0];
  const hasMatchStage =
    firstStage && typeof firstStage === 'object' && '$match' in firstStage;

  const matchStage = hasMatchStage
    ? (firstStage as PipelineStage.Match)
    : undefined;
  const postMatchStages = hasMatchStage ? resultStages.slice(1) : resultStages;

  const dataPipeline: PipelineStage[] = [...postMatchStages, sanitizeStage];
  const metaPipeline: PipelineStage[] = [{ $count: 'total' }];

  const facetStage: PipelineStage = {
    $facet: {
      data: dataPipeline,
      meta: metaPipeline,
    } as Record<string, PipelineStage[]>,
  } as unknown as PipelineStage;

  const addFieldsStage: PipelineStage = {
    $addFields: {
      meta: {
        $ifNull: [{ $arrayElemAt: ['$meta', 0] }, { total: 0 }],
      },
    },
  };

  const facetPipeline: PipelineStage[] = [
    ...lookupStages,
    ...(matchStage ? [matchStage] : []),
    facetStage,
    addFieldsStage,
  ];

  const aggregated = await User.aggregate(facetPipeline);
  const facetResult = aggregated[0] ?? { data: [], meta: { total: 0 } };
  const total = (facetResult.meta?.total as number | undefined) ?? 0;
  const meta = builder.buildMeta(total);

  return { data: (facetResult.data as unknown[]) ?? [], meta };
};

const updateUserHandler = async (
  userId: string,
  updateData: Record<string, unknown>,
  profileImage?: Express.Multer.File
) => {
  if (updateData.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Password cannot be updated here'
    );
  }
  if (updateData.email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email cannot be updated here');
  }

  const userExists = await User.findById(userId);
  if (!userExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const updateDataInfo: Record<string, unknown> = {};

  if (updateData.name) {
    updateDataInfo.name = updateData.name;
  }

  if (updateData.bio) {
    updateDataInfo.bio = updateData.bio;
  }

  if (profileImage) {
    // Upload file in cloudinary and get the URL
    const result = await uploadFileToCloudinary(profileImage.path, {
      resource_type: 'image',
      folder: 'clarifyX/profile-images',
    });

    updateDataInfo.profileImage = result.secure_url;
  }

  const user = await User.findByIdAndUpdate(userId, updateDataInfo, {
    new: true,
  }).select(
    '-password -resetPasswordToken -resetPasswordExpires -loginOtp -loginOtpExpires -authorVerificationStatus'
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

const changeUserStatusHandler = async (
  userId: string,
  payload: Record<string, unknown>,
  requestingUserRole: string
) => {
  const user = await User.findById(userId).select('name email status role');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if admin is trying to change admin or super_admin status
  if (requestingUserRole === 'admin') {
    if (user.role === 'admin' || user.role === 'super_admin') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Admins cannot change the status of other admins or super admins. Only super admins can perform this action.'
      );
    }
  }

  // Prevent changing super_admin status (only super_admin can change another super_admin)
  if (user.role === 'super_admin' && requestingUserRole !== 'super_admin') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only super admins can change the status of other super admins.'
    );
  }

  const targetStatus = payload.status as string;
  const currentStatus = user.status;

  // Status transition validation rules
  if (currentStatus === targetStatus) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is already ${currentStatus}. Cannot change status to the same value.`
    );
  }

  if (currentStatus === 'blocked' && targetStatus === 'inactive') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot change blocked user to inactive. You can only reactivate (set to active) a blocked account.'
    );
  }

  // Update user status
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { status: targetStatus },
    { new: true }
  ).select(
    '-password -resetPasswordToken -resetPasswordExpires -loginOtp -loginOtpExpires -authorVerificationStatus'
  );

  if (!updatedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Send email notification based on status
  try {
    const adminMessage = payload.message as string | undefined;

    if (targetStatus === userStatus.blocked) {
      await sendEmail({
        to: user.email,
        subject: '⛔ Your CreatifyX Account Has Been Blocked',
        html: accountBlockedEmailTemplate(user.name, adminMessage),
      });
    } else if (targetStatus === userStatus.inactive) {
      await sendEmail({
        to: user.email,
        subject: '⚠️ Your CreatifyX Account Has Been Deactivated',
        html: accountInactiveEmailTemplate(user.name, adminMessage),
      });
    } else if (targetStatus === userStatus.active) {
      await sendEmail({
        to: user.email,
        subject: '✅ Your CreatifyX Account Has Been Reactivated',
        html: accountReactivatedEmailTemplate(user.name, adminMessage),
      });
    }
  } catch (emailError) {
    // Log email error but don't fail the operation
    console.error('Failed to send status change email:', emailError);
  }

  return updatedUser;
};

export {
  getMeHandler,
  getSingleUserHandler,
  getAllUsersHandler,
  updateUserHandler,
  changeUserStatusHandler,
};
