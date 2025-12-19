import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { userRoles } from '../user/user.constant';
import {
  createAssetValidationSchema,
  updateAssetValidationSchema,
} from './asset.validation';
import {
  createAsset,
  getAllAssets,
  getSingleAsset,
  updateAsset,
  getMyPendingAssets,
  getPendingAssets,
  approveAsset,
  rejectAsset,
  // deleteAsset,
} from './asset.controller';
import upload from '../../utils/multer';
import AppError from '../../errors/appError';

const assetRoutes = Router();

// Create asset - authors
// Accept main file under `file` and multiple optional previews under `preview`
assetRoutes.post(
  '/',
  auth(userRoles.author),
  // accept main file under `file`, up to 5 preview images under `preview`
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'preview', maxCount: 5 }, // Allow up to 5 preview images
  ]),
  (req, res, next) => {
    if (req.body?.data) {
      req.body = JSON.parse(req.body?.data);
      next();
    } else {
      throw new AppError(400, 'Please provide data field in JSON format');
    }
  },
  validateRequest(createAssetValidationSchema),
  createAsset
);

// Update asset - admins and super admin
assetRoutes.patch(
  '/:id',
  auth(userRoles.super_admin, userRoles.admin),
  validateRequest(updateAssetValidationSchema),
  updateAsset
);

// Delete asset - admins and super admin
// assetRoutes.delete(
//   '/:id',
//   auth(userRoles.super_admin, userRoles.admin),
//   deleteAsset
// );

// Get my pending assets - Authors only
assetRoutes.get('/author/pending', auth(userRoles.author), getMyPendingAssets);

// Get all pending assets - Admins only
assetRoutes.get(
  '/admin/pending',
  auth(userRoles.super_admin, userRoles.admin),
  getPendingAssets
);

// Approve asset - Admins only
assetRoutes.patch(
  '/:id/approve',
  auth(userRoles.super_admin, userRoles.admin),
  approveAsset
);

// Reject asset - Admins only
assetRoutes.patch(
  '/:id/reject',
  auth(userRoles.super_admin, userRoles.admin),
  rejectAsset
);

// Get single asset and list
assetRoutes.get('/:id', getSingleAsset);
assetRoutes.get('/', getAllAssets);

export default assetRoutes;
