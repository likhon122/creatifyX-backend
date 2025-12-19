import {
  TAuthorVerificationStatus,
  TOrganizationRole,
  TUserRole,
  TUserStatus,
} from './user.interface';

const userRoles: Record<TUserRole, TUserRole> = {
  super_admin: 'super_admin',
  admin: 'admin',
  subscriber: 'subscriber',
  author: 'author',
} as const;

const userStatus: Record<TUserStatus, TUserStatus> = {
  active: 'active',
  inactive: 'inactive',
  blocked: 'blocked',
} as const;

const organizationRoles: Record<TOrganizationRole, TOrganizationRole> = {
  owner: 'owner',
  member: 'member',
  admin: 'admin',
} as const;

const authorVerificationStatuses: Record<
  TAuthorVerificationStatus,
  TAuthorVerificationStatus
> = {
  pending: 'pending',
  active: 'active',
  not_started: 'not_started',
  suspended: 'suspended',
} as const;

export { userRoles, userStatus, organizationRoles, authorVerificationStatuses };
