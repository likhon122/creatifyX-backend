import { Types } from 'mongoose';

export type TContactStatus = 'pending' | 'replied' | 'closed';

export type TContactPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TContactCategory =
  | 'general'
  | 'technical'
  | 'billing'
  | 'feature_request'
  | 'bug_report'
  | 'account'
  | 'other';

export type TContact = {
  user: Types.ObjectId;
  subject: string;
  category: TContactCategory;
  priority: TContactPriority;
  message: string;
  status: TContactStatus;
  adminReply?: {
    admin: Types.ObjectId;
    message: string;
    repliedAt: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export type TCreateContactInput = {
  userId: string;
  subject: string;
  category: TContactCategory;
  priority: TContactPriority;
  message: string;
};

export type TAdminReplyInput = {
  contactId: string;
  adminId: string;
  message: string;
};

export type TGetContactsQuery = {
  status?: TContactStatus;
  category?: TContactCategory;
  priority?: TContactPriority;
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
};

export type TContactResponse = {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  subject: string;
  category: TContactCategory;
  priority: TContactPriority;
  message: string;
  status: TContactStatus;
  adminReply?: {
    admin: {
      _id: string;
      name: string;
      email: string;
    };
    message: string;
    repliedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
};
