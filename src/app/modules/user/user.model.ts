import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { TUser, UserModelType } from './user.interface';
import {
  authorVerificationStatuses,
  organizationRoles,
  userRoles,
  userStatus,
} from './user.constant';
import { bcryptSaltRounds } from '../../config';

const userSchema = new Schema<TUser, UserModelType>(
  {
    name: {
      type: String,
      required: [true, 'Name is required to create user!'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required to create user!'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required!'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: [
        userRoles.super_admin,
        userRoles.admin,
        userRoles.subscriber,
        userRoles.author,
      ],
      default: userRoles.subscriber,
    },
    profileImage: { type: String, default: '' },
    bio: { type: String, trim: true, default: '' },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    orgRole: {
      type: String,
      enum: [
        organizationRoles.owner,
        organizationRoles.admin,
        organizationRoles.member,
      ],
      default: null,
    },
    status: {
      type: String,
      enum: [userStatus.active, userStatus.inactive, userStatus.blocked],
      default: userStatus.active,
    },
    isPremium: { type: Boolean, default: false },
    authorVerificationStatus: {
      type: String,
      enum: [
        authorVerificationStatuses.pending,
        authorVerificationStatuses.active,
        authorVerificationStatuses.not_started,
        authorVerificationStatuses.suspended,
      ],
      default: authorVerificationStatuses.not_started,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: [0, 'Total earnings cannot be negative'],
    },
    isDeleted: { type: Boolean, default: false },
    passwordResetIp: { type: String, default: null, select: false },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    loginOtp: { type: Number, default: null, select: false },
    loginOtpExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;

  // ✅ Generate random avatar if not provided
  if (!user.profileImage) {
    const seed = crypto.createHash('md5').update(user.email).digest('hex');
    // You can pick from DiceBear styles like: "adventurer", "micah", "bottts", "identicon"
    user.profileImage = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
  }

  // ✅ Hash password before saving
  if (user.isModified('password')) {
    const hashedPassword = await bcrypt.hash(
      user.password,
      Number(bcryptSaltRounds)
    );
    user.password = hashedPassword;
  }

  next();
});

userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

userSchema.statics.isUserExistByCustomId = async function (_id: string) {
  const user = await User.findById(_id).select(
    '+password +passwordResetToken +passwordResetExpires'
  );
  if (user) {
    return user;
  }
  return null;
};

userSchema.statics.hashPassword = async function (password: string) {
  if (!password) {
    throw new Error('Password is required to hash.');
  }
  const hashedPassword = await bcrypt.hash(password, Number(bcryptSaltRounds));
  return hashedPassword;
};

userSchema.statics.isJwtIssuedBeforePasswordChange = function (
  passwordResetExpires: Date,
  jwtIssuedAt: number
) {
  const passwordChangeTime = new Date(passwordResetExpires).getTime() / 1000;
  return passwordChangeTime > jwtIssuedAt;
};

export const User = model<TUser, UserModelType>('User', userSchema);
