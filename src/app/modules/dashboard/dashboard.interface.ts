import { Types } from 'mongoose';

export type TEarning = {
  author: Types.ObjectId;
  asset: Types.ObjectId;
  payment: Types.ObjectId;
  buyer: Types.ObjectId;
  assetPrice: number;
  isPremiumBuyer: boolean;
  platformFee: number;
  platformFeePercentage: number;
  authorEarning: number;
  companyEarning: number;
  earningDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TCreateEarningInput = {
  authorId: string;
  assetId: string;
  paymentId: string;
  buyerId: string;
  assetPrice: number;
  isPremiumBuyer: boolean;
};

// Author Analytics
export type TAuthorAnalytics = {
  views: {
    lifetime: number;
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  downloads: {
    lifetime: number;
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  earnings: {
    lifetime: number;
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  topAssets: Array<{
    assetId: string;
    title: string;
    views: number;
    downloads: number;
    earnings: number;
  }>;
};

// Admin Analytics
export type TAdminAnalytics = {
  views: {
    lifetime: number;
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  downloads: {
    lifetime: number;
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  earnings: {
    total: {
      lifetime: number;
      today: number;
      yesterday: number;
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
    };
    company: {
      lifetime: number;
      today: number;
      yesterday: number;
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
    };
    authors: {
      lifetime: number;
      today: number;
      yesterday: number;
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
    };
  };
  users: {
    total: number;
    subscribers: number;
    authors: number;
    premium: number;
  };
  assets: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};
