import { Router } from 'express';
import auth from '../../middlewares/auth';
import {
  getAllUsers,
  getMe,
  getSingleUser,
  updateUser,
  changeUserStatus,
} from './user.controller';
import upload from '../../utils/multer';
import validateRequest from '../../middlewares/validateRequest';
import { blockUserSchema } from './user.validation';

const userRoutes = Router();

userRoutes.get(
  '/me',
  auth('admin', 'subscriber', 'super_admin', 'author'),
  getMe
);

userRoutes.patch(
  '/change-user-status/:id',
  auth('super_admin', 'admin'),
  validateRequest(blockUserSchema),
  changeUserStatus
);

userRoutes.get('/:id', getSingleUser);

userRoutes.patch(
  '/:id',
  auth('super_admin', 'admin', 'author', 'subscriber'),
  upload.single('profileImage'),
  updateUser
);

userRoutes.get('/', auth('super_admin', 'admin'), getAllUsers);

export default userRoutes;
