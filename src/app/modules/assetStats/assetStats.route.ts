import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import {
  getStatsSchema,
  incrementViewSchema,
  recordDownloadSchema,
  toggleLikeSchema,
} from './assetStats.validation';
import { AssetStatsController } from './assetStats.controller';

const router = Router();

// Public route - anyone can view
router.post(
  '/view',
  validateRequest(incrementViewSchema),
  AssetStatsController.incrementView
);

// Protected route - only authenticated users can like
router.post(
  '/like',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(toggleLikeSchema),
  AssetStatsController.toggleLike
);

// Protected route - only users who purchased can download
router.post(
  '/download',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(recordDownloadSchema),
  AssetStatsController.recordDownload
);

// Protected route - download asset as zip file
router.post(
  '/download-zip',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(recordDownloadSchema),
  AssetStatsController.downloadAsZip
);

// Public route - get stats (shows user-specific data if authenticated)
router.get(
  '/:assetId',
  validateRequest(getStatsSchema),
  AssetStatsController.getAssetStats
);

// Protected route - get detailed stats with populated user data (admin only)
router.get(
  '/:assetId/detailed',
  auth('admin', 'super_admin'),
  validateRequest(getStatsSchema),
  AssetStatsController.getDetailedAssetStats
);

export const AssetStatsRoutes = router;
