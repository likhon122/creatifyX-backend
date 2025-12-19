import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import {
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
} from './category.validation';
import auth from '../../middlewares/auth';
import { userRoles } from '../user/user.constant';
import {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
} from './category.controller';

const categoryRoutes = Router();

categoryRoutes.post(
  '/',
  auth(userRoles.super_admin, userRoles.admin),
  validateRequest(createCategoryValidationSchema),
  createCategory
);

categoryRoutes.patch(
  '/:id',
  auth(userRoles.super_admin, userRoles.admin),
  validateRequest(updateCategoryValidationSchema),
  updateCategory
);

categoryRoutes.get('/:id', getSingleCategory);

categoryRoutes.get('/', getAllCategories);

export default categoryRoutes;
