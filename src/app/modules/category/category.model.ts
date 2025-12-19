import { Schema, model } from 'mongoose';
import { TCategory } from './category.interface';

const categorySchema = new Schema<TCategory>(
  {
    name: {
      type: String,
      required: [true, 'Name is required to create category'],
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required to create category'],
      unique: true,
    },
    parentCategory: {
      type: Boolean,
      default: false,
    },
    subCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    categoryType: {
      type: String,
      enum: ['sub_category', 'main_category'],
      default: 'main_category',
    },
    availableFilters: [
      new Schema(
        {
          filterKey: {
            type: String,
            required: [true, 'Filter key is required'],
          },
          displayName: {
            type: String,
            required: [true, 'Display name is required'],
          },
          options: [
            new Schema(
              {
                displayName: {
                  type: String,
                  required: [true, 'Display name is required'],
                },
                value: {
                  type: Schema.Types.Mixed,
                  required: [true, 'Value is required'],
                },
              },
              { _id: false }
            ),
          ],
        },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);

export const Category = model<TCategory>('Category', categorySchema);
