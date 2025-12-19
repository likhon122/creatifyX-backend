import { Router } from 'express';
import { authorReplySchema, createReviewSchema } from './review.validation';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import {
  addAuthorReply,
  createReview,
  deleteReview,
  getReviewsByAssetId,
  getReviewById,
  getAuthorReviews,
} from './review.controller';

const router = Router();

// Route 1: Get reviews for author's assets - Author only
router.get('/author/my-reviews', auth('author'), getAuthorReviews);

// Route 2: Get reviews by asset ID - Public access
router.get('/asset/:assetId', getReviewsByAssetId);

// Route 3: Get single review by ID - Public access
router.get('/:reviewId', getReviewById);

// Route 4: Create review - Only paid subscribers or asset downloaders
router.post(
  '/',
  auth('subscriber', 'author', 'admin', 'super_admin'),
  validateRequest(createReviewSchema),
  createReview
);

// Route 5: Author reply to review - Only asset author
router.post(
  '/:reviewId/reply',
  auth('author'),
  validateRequest(authorReplySchema),
  addAuthorReply
);

// Route 6: Delete review - Only admin/super_admin
router.delete('/:reviewId', auth('admin', 'super_admin'), deleteReview);

export const ReviewRoutes = router;
