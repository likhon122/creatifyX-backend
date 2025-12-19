import { Types } from 'mongoose';

export type TReview = {
  asset: Types.ObjectId;
  buyer: Types.ObjectId;
  rating: number;
  comment: string;
  authorReply?: {
    comment: string;
    repliedAt: Date;
  };
  isEdited: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TCreateReviewInput = {
  assetId: string;
  buyerId: string;
  rating: number;
  comment: string;
};

export type TUpdateReviewInput = {
  reviewId: string;
  buyerId: string;
  rating?: number;
  comment?: string;
};

export type TAuthorReplyInput = {
  reviewId: string;
  authorId: string;
  comment: string;
};

export type TDeleteReviewInput = {
  reviewId: string;
  userId: string;
  userRole: string;
};

export type TGetReviewsQuery = {
  assetId?: string;
  buyerId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
};

export type TReviewResponse = {
  _id: string;
  asset: {
    _id: string;
    title: string;
    slug: string;
  };
  buyer: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  rating: number;
  comment: string;
  authorReply?: {
    comment: string;
    repliedAt: Date;
  };
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
};
