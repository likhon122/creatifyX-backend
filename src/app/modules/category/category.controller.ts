import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';
import { successResponse } from '../../utils/response';
import {
  createCategoryHandler,
  getAllCategoriesHandler,
  getSingleCategoryHandler,
  updateCategoryHandler,
} from './category.service';

const createCategory = catchAsync(async (req, res) => {
  const result = await createCategoryHandler(req.body);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Category created successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await updateCategoryHandler(id, req.body);

  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Category updated successfully',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await getSingleCategoryHandler(id);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Category fetched successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req, res) => {
  const { parentCategory } = req.query;

  const query: { parentCategory?: boolean } = {};
  if (parentCategory !== undefined) {
    query.parentCategory = parentCategory === 'true';
  }

  const result = await getAllCategoriesHandler(query);
  successResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Categories fetched successfully',
    data: result,
  });
});

export { createCategory, updateCategory, getSingleCategory, getAllCategories };
