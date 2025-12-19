import { Schema, model } from 'mongoose';
import { TReview } from './review.interface';

const reviewSchema = new Schema<TReview>(
  {
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
      index: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    authorReply: {
      comment: {
        type: String,
        trim: true,
        maxlength: [1000, 'Reply cannot exceed 1000 characters'],
      },
      repliedAt: {
        type: Date,
      },
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index to ensure one review per buyer per asset
reviewSchema.index({ asset: 1, buyer: 1 }, { unique: true });

// Index for efficient queries
reviewSchema.index({ asset: 1, createdAt: -1 });
reviewSchema.index({ asset: 1, rating: -1 });
reviewSchema.index({ buyer: 1, createdAt: -1 });

export const Review = model<TReview>('Review', reviewSchema);
