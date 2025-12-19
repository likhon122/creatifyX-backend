import { Router } from 'express';
import auth from '../../middlewares/auth';
import {
  getAuthorAnalytics,
  getAdminAnalytics,
  backfillEarnings,
} from './dashboard.controller';

const dashboardRoutes = Router();

// Author analytics - Authors only
dashboardRoutes.get('/author', auth('author'), getAuthorAnalytics);

// Admin analytics - Admin and Super Admin only
dashboardRoutes.get('/admin', auth('admin', 'super_admin'), getAdminAnalytics);

// Backfill earnings - Admin and Super Admin only (run once to sync existing data)
dashboardRoutes.post(
  '/backfill-earnings',
  auth('admin', 'super_admin'),
  backfillEarnings
);

export default dashboardRoutes;
