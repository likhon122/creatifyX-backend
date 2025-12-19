import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import {
  createPlanValidationSchema,
  updatePlanValidationSchema,
} from './plan.validation';
import auth from '../../middlewares/auth';
import { userRoles } from '../user/user.constant';
import { createPlan, getAllPlans, updatePlan } from './plan.controller';

const planRoutes = Router();

planRoutes.post(
  '/',
  auth(userRoles.super_admin, userRoles.admin),
  validateRequest(createPlanValidationSchema),
  createPlan
);

planRoutes.patch(
  '/:id',
  auth(userRoles.super_admin, userRoles.admin),
  validateRequest(updatePlanValidationSchema),
  updatePlan
);

planRoutes.get('/', getAllPlans);

export default planRoutes;
