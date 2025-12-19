import { Model, Types } from 'mongoose';

export type TUserStatus = 'active' | 'inactive' | 'blocked';
export type TUserRole = 'subscriber' | 'author' | 'admin' | 'super_admin';
export type TOrganizationRole = 'owner' | 'admin' | 'member';
export type TAuthorVerificationStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'not_started';

export type TUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: TUserRole;
  profileImage?: string;
  bio?: string;
  organization: Types.ObjectId | null;
  orgRole: TOrganizationRole | null;
  status: TUserStatus;
  authorVerificationStatus: TAuthorVerificationStatus;
  isPremium: boolean;
  totalEarnings: number;
  isDeleted: boolean;
  passwordResetIp?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  loginOtp?: number;
  loginOtpExpires?: Date;
};

export interface UserModelType extends Model<TUser> {
  isUserExistByCustomId(id: string): Promise<TUser>;
  hashPassword(password: string): Promise<string>;
  isJwtIssuedBeforePasswordChange(
    passwordResetExpires: Date,
    jwtIssuedAt: number
  ): boolean;
}
