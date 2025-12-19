import { Types } from 'mongoose';

export type TAssetMetadata = {
  asset: Types.ObjectId;
  extracted?: {
    resolution?: string;
    duration?: number;
    fileFormat?: string;
  };
  aiGenerated?: {
    keywords: string[];
    description: string;
    dominantColors: string[];
  };
  manualKeywords: string[];
};
