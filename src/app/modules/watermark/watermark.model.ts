import { Schema, model } from 'mongoose';
import { TWatermark } from './watermark.interface';

const watermarkSchema = new Schema<TWatermark>(
  {
    public_id: {
      type: String,
      required: true,
    },
    secure_url: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: String,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Watermark = model<TWatermark>('Watermark', watermarkSchema);
