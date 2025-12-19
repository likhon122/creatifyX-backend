import { Schema, model } from 'mongoose';
import { TOrganization } from './organization.types';

const organizationSchema = new Schema<TOrganization>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
);

export const Organization = model<TOrganization>(
  'Organization',
  organizationSchema
);
