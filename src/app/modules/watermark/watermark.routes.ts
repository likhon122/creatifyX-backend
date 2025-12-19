import { Router } from 'express';
import auth from '../../middlewares/auth';
import { userRoles } from '../user/user.constant';
import { WatermarkController } from './watermark.controller';
import upload from '../../utils/multer';

const watermarkRoutes = Router();

// Upload watermark - Admin and Super Admin only
watermarkRoutes.post(
  '/upload',
  auth(userRoles.super_admin, userRoles.admin),
  upload.single('watermark'),
  WatermarkController.uploadWatermark
);

// Get active watermark - Admin and Super Admin only
watermarkRoutes.get(
  '/active',
  auth(userRoles.super_admin, userRoles.admin),
  WatermarkController.getActiveWatermark
);

// Get all watermarks - Admin and Super Admin only
watermarkRoutes.get(
  '/',
  auth(userRoles.super_admin, userRoles.admin),
  WatermarkController.getAllWatermarks
);

// Set active watermark - Admin and Super Admin only
watermarkRoutes.patch(
  '/:id/activate',
  auth(userRoles.super_admin, userRoles.admin),
  WatermarkController.setActiveWatermark
);

// Delete watermark - Admin and Super Admin only
watermarkRoutes.delete(
  '/:id',
  auth(userRoles.super_admin, userRoles.admin),
  WatermarkController.deleteWatermark
);

export default watermarkRoutes;
