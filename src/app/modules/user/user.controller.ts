import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import {
  getAllUsersHandler,
  getMeHandler,
  getSingleUserHandler,
  updateUserHandler,
  changeUserStatusHandler,
} from './user.service';

const getMe = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await getMeHandler(user.userId);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User fetched successfully',
    data: result,
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  const user = await getSingleUserHandler(req.params.id);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User fetched successfully',
    data: user,
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const users = await getAllUsersHandler(req.query);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Users fetched successfully',
    data: users.data,
    meta: users.meta,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const user = req.user;

  const profileImage = req.file;
  const result = await updateUserHandler(user.userId, req.body, profileImage);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User updated successfully',
    data: result,
  });
});

const changeUserStatus = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const status = req.body.status;
  const requestingUser = req.user;

  const result = await changeUserStatusHandler(
    userId,
    req.body,
    requestingUser.role
  );

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `User status has been updated to ${status} successfully`,
    data: result,
  });
});

export { getMe, getSingleUser, getAllUsers, updateUser, changeUserStatus };
