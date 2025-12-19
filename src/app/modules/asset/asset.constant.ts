import { TAssetOrientation, TAssetStatus } from './asset.interface';

const assetStatus: Record<TAssetStatus, TAssetStatus> = {
  pending_review: 'pending_review',
  approved: 'approved',
  rejected: 'rejected',
} as const;

const assetTypes = {
  image: 'image',
  video: 'video',
  web: 'web',
  presentation: 'presentation',
  graphic_template: 'graphic-template',
} as const;

const assetOrientations: Record<TAssetOrientation, TAssetOrientation> = {
  horizontal: 'horizontal',
  vertical: 'vertical',
  square: 'square',
} as const;

export { assetStatus, assetTypes, assetOrientations };
