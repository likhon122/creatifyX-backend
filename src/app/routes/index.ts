import { Router } from 'express';
import { TRouteModules } from './routes.type';
import userRoutes from '../modules/user/user.route';
import authRoutes from '../modules/auth/auth.routes';
import planRoutes from '../modules/plan/plan.routes';
import categoryRoutes from '../modules/category/category.routes';
import assetRoutes from '../modules/asset/asset.routes';
import subscriptionRoutes from '../modules/subscription/subscription.routes';
import individualPaymentRoutes from '../modules/individualPayment/individualPayment.route';
import { AssetStatsRoutes } from '../modules/assetStats/assetStats.route';
import { ReviewRoutes } from '../modules/review/review.route';
import { ContactRoutes } from '../modules/contact/contact.route';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import watermarkRoutes from '../modules/watermark/watermark.routes';

const router = Router();

const routeModules: TRouteModules = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/plans',
    route: planRoutes,
  },
  {
    path: '/categories',
    route: categoryRoutes,
  },
  {
    path: '/assets',
    route: assetRoutes,
  },
  {
    path: '/subscriptions',
    route: subscriptionRoutes,
  },
  {
    path: '/individual-payments',
    route: individualPaymentRoutes,
  },
  {
    path: '/asset-stats',
    route: AssetStatsRoutes,
  },
  {
    path: '/reviews',
    route: ReviewRoutes,
  },
  {
    path: '/contacts',
    route: ContactRoutes,
  },
  {
    path: '/dashboard',
    route: dashboardRoutes,
  },
  {
    path: '/watermarks',
    route: watermarkRoutes,
  },
];

routeModules.forEach(route => router.use(route.path, route.route));

export default router;
