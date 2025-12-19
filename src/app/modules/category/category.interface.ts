import { Types } from 'mongoose';

type TNestedFilterValue = {
  displayName: string;
  filterKey: string;
};

type TFilterOption = {
  displayName: string;
  value: string | TNestedFilterValue[];
};

type IAvailableFilter = {
  filterKey: string;
  displayName: string;
  options: TFilterOption[];
};

export type TCategory = {
  name: string;
  slug: string;
  parentCategory?: boolean;
  subCategories?: Types.ObjectId[];
  categoryType?: 'sub_category' | 'main_category';
  availableFilters?: IAvailableFilter[];
};
