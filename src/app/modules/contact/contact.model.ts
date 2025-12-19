import { Schema, model } from 'mongoose';
import { TContact } from './contact.interface';
import {
  contactStatus,
  contactPriority,
  contactCategory,
} from './contact.constant';

const contactSchema = new Schema<TContact>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [5, 'Subject must be at least 5 characters'],
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: Object.values(contactCategory),
      required: [true, 'Category is required'],
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(contactPriority),
      default: contactPriority.medium,
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [20, 'Message must be at least 20 characters'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(contactStatus),
      default: contactStatus.pending,
      index: true,
    },
    adminReply: {
      admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      message: {
        type: String,
        trim: true,
        maxlength: [5000, 'Reply cannot exceed 5000 characters'],
      },
      repliedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
contactSchema.index({ user: 1, createdAt: -1 });
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ category: 1, status: 1 });
contactSchema.index({ priority: 1, status: 1 });

export const Contact = model<TContact>('Contact', contactSchema);
