export const contactStatus = {
  pending: 'pending',
  replied: 'replied',
  closed: 'closed',
} as const;

export const contactPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
} as const;

export const contactCategory = {
  general: 'general',
  technical: 'technical',
  billing: 'billing',
  feature_request: 'feature_request',
  bug_report: 'bug_report',
  account: 'account',
  other: 'other',
} as const;
