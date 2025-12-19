import { Schema, model } from 'mongoose';
import { TPlan } from './plan.interface';
import { billingCycles, currency, planTypes } from './plan.constant';

const planSchema = new Schema<TPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    type: {
      type: String,
      enum: [planTypes.individual, planTypes.team, planTypes.enterprise],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: [billingCycles.monthly, billingCycles.yearly],
      required: true,
    },
    price: { type: Number, required: true },
    currency: {
      type: String,
      enum: [currency.USD, currency.BDT],
      default: 'USD',
    },
    stripePriceId: { type: String, required: true, unique: true },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Plan = model<TPlan>('Plan', planSchema);

export default Plan;
