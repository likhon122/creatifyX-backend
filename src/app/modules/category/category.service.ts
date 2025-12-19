import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { TCategory } from './category.interface';
import { Category } from './category.model';

const createCategoryHandler = async (payload: TCategory) => {
  const categorySlug =
    payload.slug || payload.name.toLowerCase().replace(/ /g, '-');

  // Check if the category with the same slug already exists
  const categoryExists = await Category.findOne({
    slug: categorySlug,
  });

  if (categoryExists) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Category with the same slug already exists'
    );
  }

  // Set categoryType based on parentCategory flag
  payload.categoryType = payload.parentCategory
    ? 'main_category'
    : 'sub_category';

  // Validate subCategories if provided
  if (payload.subCategories && payload.subCategories.length > 0) {
    const subCategoriesExist = await Category.find({
      _id: { $in: payload.subCategories },
    });

    if (subCategoriesExist.length !== payload.subCategories.length) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'One or more subcategories not found'
      );
    }
  }

  const category = await Category.create({
    ...payload,
    slug: categorySlug,
  });

  // Populate subCategories before returning
  await category.populate('subCategories');

  return category;
};

const updateCategoryHandler = async (
  id: string,
  payload: Partial<TCategory>
) => {
  const category = await Category.findById(id);

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }

  // Prevent same name update
  if (
    payload.name &&
    payload.name === category.name &&
    id !== category._id.toString()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New category name must be different from the current name'
    );
  }

  // Update slug if name is changed
  if (payload.name && !payload.slug) {
    payload.slug = payload.name.toLowerCase().replace(/ /g, '-');
  }

  // Check if slug already exists (excluding current category)
  if (payload.slug) {
    const slugExists = await Category.findOne({
      slug: payload.slug,
      _id: { $ne: id },
    });
    if (slugExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Category with this slug already exists'
      );
    }
  }

  // Validate subCategories if provided
  if (payload.subCategories && payload.subCategories.length > 0) {
    const subCategoriesExist = await Category.find({
      _id: { $in: payload.subCategories },
    });

    if (subCategoriesExist.length !== payload.subCategories.length) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'One or more subcategories not found'
      );
    }
  }

  // Update categoryType based on parentCategory flag
  if (payload.parentCategory !== undefined) {
    payload.categoryType = payload.parentCategory
      ? 'main_category'
      : 'sub_category';
  }

  // Handle available filters update
  if (payload.availableFilters) {
    category.availableFilters = payload.availableFilters;
  }

  // Update fields safely
  const fields: (keyof TCategory)[] = [
    'name',
    'slug',
    'parentCategory',
    'categoryType',
    'subCategories',
  ];

  fields.forEach(key => {
    if (payload[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (category as any)[key] = payload[key];
    }
  });

  await category.save();

  // Populate subCategories before returning
  await category.populate('subCategories');

  return category;
};

const getSingleCategoryHandler = async (id: string) => {
  const category = await Category.findById(id).populate({
    path: 'subCategories',
    select: 'name slug categoryType',
  });
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }
  return category;
};

const getAllCategoriesHandler = async (query?: {
  parentCategory?: boolean;
}) => {
  const filter: { parentCategory?: boolean } = {};

  if (query?.parentCategory !== undefined) {
    filter.parentCategory = query.parentCategory;
  }

  const categories = await Category.find(filter).populate({
    path: 'subCategories',
    select: 'name slug categoryType',
  });
  return categories;
};

export {
  createCategoryHandler,
  updateCategoryHandler,
  getSingleCategoryHandler,
  getAllCategoriesHandler,
};
