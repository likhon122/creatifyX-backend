import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import httpStatus from '../../constant/httpStatus';
import AppError from '../../errors/appError';
import { TUser } from '../user/user.interface';
import { User } from '../user/user.model';
import {
  accessTokenExpiresIn,
  envMode,
  frontendUrl,
  jwtSecretKey,
  refreshTokenExpiresIn,
} from '../../config';
import sendEmail from '../../utils/sendEmail';
import {
  passwordResetEmailTemplate,
  passwordResetSuccessEmailTemplate,
} from '../../utils/email/passwordResetEmail';
import { userRoles } from '../user/user.constant';
import createJwtToken from '../../utils/createJwtToken';
import isPasswordMatched from '../../utils/isPasswordMatched';
import verifyJwtToken from '../../utils/verifyJwtToken';

const signupHandler = async (payload: TUser) => {
  // Find if user already exists
  const userExists = await User.findOne({ email: payload.email });

  if (userExists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User already exists with this email'
    );
  }

  // Create a new jwt token to verify email
  const userJwtToken = jwt.sign(payload, jwtSecretKey as string, {
    expiresIn: '5m',
  });

  // Mail body
  const mailBody = {
    to: payload.email,
    subject: 'Verify your email',
    message: 'Please verify your email by clicking the link below.',
    html: `<p>Click <a href="${frontendUrl}/auth/verify-email?token=${userJwtToken}">here</a> to verify your email. This link will expire in 5 minutes.</p>`,
  };

  // Send verification email
  try {
    await sendEmail(mailBody);
  } catch (emailError: any) {
    console.warn(
      '⚠️ Failed to send verification email:',
      emailError?.message || emailError
    );
  }

  return envMode === 'development'
    ? {
        token: envMode === 'development' ? userJwtToken : '',
      }
    : {};
};

const registerUserHandler = async (payload: { token: string }) => {
  const { token } = payload;

  const decodedData = jwt.verify(token, jwtSecretKey);

  if (!decodedData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid or expired token!');
  }

  const decodedToken = decodedData as {
    name: string;
    email: string;
    password: string;
  };

  const { name, email, password } = decodedToken;

  // Find if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User already exists. Please login.'
    );
  }

  // Send a welcome email
  const mailBody = {
    to: email,
    subject: 'Welcome to Our Platform!',
    message: 'We are excited to have you on board.',
    html: `<p>Hi ${name},</p><p>Welcome to our platform! We're thrilled to have you with us.</p>`,
  };
  try {
    await sendEmail(mailBody);
  } catch (emailError: any) {
    console.warn(
      '⚠️ Failed to send welcome email:',
      emailError?.message || emailError
    );
  }

  // Generate a default profile image using gravatar
  const userData = {
    name,
    email,
    password,
    role: userRoles.subscriber,
  };

  // Create a new user
  const user = await User.create(userData);

  // Create Refresh token and Access Token
  const refreshToken = createJwtToken(
    { userId: user._id.toString(), role: user.role },
    jwtSecretKey as string,
    refreshTokenExpiresIn
  );

  const accessToken = createJwtToken(
    { userId: user._id.toString(), role: user.role },
    jwtSecretKey as string,
    accessTokenExpiresIn
  );

  user.password = '';

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const loginHandler = async (payload: { email: string; password: string }) => {
  const { email, password } = payload;

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid email or password!');
  }

  if (user.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User account has been deleted. Please contact support to restore your account.'
    );
  }

  // Check if user is blocked or inactive
  if (user.status === 'blocked') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked by the administration. Please contact support for more information.'
    );
  }

  if (user.status === 'inactive') {
    // Change the user status to active
    await User.findByIdAndUpdate(
      user._id,
      { status: 'active' },
      { new: true }
    ).select('_id');
  }

  const isPasswordValid = await isPasswordMatched(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid email or password!');
  }

  // Send a verification email if the user is an author (super admin and admin log in directly)
  if (user.role === userRoles.author) {
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Generate otpExpiry time 5 minutes from now
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const mailBody = {
      to: user.email,
      subject: 'Author Account Login Notification',
      message: 'Please verify your email by clicking the link below.',
      html: `<p>Your OTP for login is: <strong>${otp}</strong>. This OTP will expire in 5 minutes.</p>`,
    };
    // Send verification email
    try {
      await sendEmail(mailBody);
    } catch (emailError: any) {
      console.warn(
        '⚠️ Failed to send login OTP email:',
        emailError?.message || emailError
      );
    }

    const updateOtp = await User.findByIdAndUpdate(
      user._id,
      { loginOtp: parseInt(otp), loginOtpExpires: otpExpiry },
      { new: true }
    ).select('_id');

    if (!updateOtp) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Failed to generate OTP. Please try again.'
      );
    }

    return envMode === 'development'
      ? {
          otp: otp,
        }
      : {};
  } else {
    // Create Refresh token and Access Token
    const refreshToken = createJwtToken(
      { userId: user._id.toString(), role: user.role },
      jwtSecretKey as string,
      refreshTokenExpiresIn
    );
    const accessToken = createJwtToken(
      { userId: user._id.toString(), role: user.role },
      jwtSecretKey as string,
      accessTokenExpiresIn
    );

    user.password = '';

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
};

const verifyOtpHandler = async (payload: { email: string; otp: number }) => {
  const { email, otp } = payload;

  const user = await User.findOne({ email }).select(
    '+loginOtp +loginOtpExpires +password'
  );
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid email or password!');
  }

  if (user.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User account has been deleted. Please contact support to restore your account.'
    );
  }

  // Check if user is blocked or inactive
  if (user.status === 'blocked') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked by the administration. Please contact support for more information.'
    );
  }

  if (user.status === 'inactive') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account is currently inactive. Please contact support to reactivate your account.'
    );
  }

  if (user.loginOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP provided!');
  }

  if (!user.loginOtpExpires) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OTP has expired! Please try again.'
    );
  }

  if (user.loginOtpExpires < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP has expired!');
  }

  // Create Refresh token and Access Token
  const refreshToken = createJwtToken(
    { userId: user._id.toString(), role: user.role },
    jwtSecretKey as string,
    refreshTokenExpiresIn
  );
  const accessToken = createJwtToken(
    { userId: user._id.toString(), role: user.role },
    jwtSecretKey as string,
    accessTokenExpiresIn
  );

  const updateUser = await User.findByIdAndUpdate(
    user._id,
    { loginOtp: null, loginOtpExpires: null },
    { new: true }
  ).select('_id');

  if (!updateUser) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update user. Please try again.'
    );
  }

  user.password = '';

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const logoutHandler = async (payload: { refreshToken: string }) => {
  if (!payload || !payload.refreshToken) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not logged in! Please login to access this resource.'
    );
  }

  return {};
};

const changePasswordHandler = async (
  payload: {
    oldPassword: string;
    newPassword: string;
  },
  userId: string,
  ipAddress: string | string[] | undefined,
  accessToken: string | undefined
) => {
  // Check if the user exists in the database
  const user = await User.isUserExistByCustomId(userId);
  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User not found! Please try again.'
    );
  }

  // Check if the password is correct
  const isPasswordMatchedResult = await isPasswordMatched(
    payload.oldPassword,
    user.password
  );

  if (!isPasswordMatchedResult) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Password is incorrect! Please check the password and try again.'
    );
  }

  // Hash the new password
  const hashedNewPassword = await User.hashPassword(payload.newPassword);

  // Update the password and invalidate any existing reset tokens
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      password: hashedNewPassword,
      passwordChangedAt: new Date(),
      passwordResetExpires: null,
      passwordResetToken: null,
      passwordResetIp: ipAddress,
    },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update password! Please try again.'
    );
  }

  return updatedUser;
};

const getRefreshTokenHandler = async (payload: { refreshToken: string }) => {
  // Check if the token is present
  if (!payload.refreshToken) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Your are unauthorized to access this resource!'
    );
  }

  // Check if the token is valid
  const isValidToken = verifyJwtToken(
    payload.refreshToken,
    jwtSecretKey as string
  ) as JwtPayload;

  if (!isValidToken) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Your are unauthorized to access this resource!'
    );
  }

  // Check if the user exists in the database
  const user = await User.isUserExistByCustomId(isValidToken.userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found with this ID');
  }

  // Check If the user is deleted or blocked
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      `This ${user.role} is already deleted! Please contact the customer support.`
    );
  } else if (user.status === 'blocked') {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      `This ${user.role} is blocked! Please contact the customer support.`
    );
  }

  // Check if the user changed password; if token was issued before change, invalidate it
  if (user.passwordChangedAt) {
    const isJwtIssuedBeforePassChange = User.isJwtIssuedBeforePasswordChange(
      user.passwordChangedAt as Date,
      isValidToken.iat as number
    );

    if (isJwtIssuedBeforePassChange) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'You changed your password recently, please login again to continue.'
      );
    }
  }

  const jwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const accessToken = createJwtToken(
    jwtPayload,
    jwtSecretKey as string,
    accessTokenExpiresIn
  );
  return {
    accessToken,
  };
};

const forgotPasswordHandler = async (email: string) => {
  if (!email) {
    return;
  }

  // Normalize email to lowercase and trim
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await User.findOne({ email: normalizedEmail });

  // Security (Account Enumeration Prevention): If user does not exist or is inactive,
  // do not throw 404 or disclose existence; return silently.
  if (!user || user.isDeleted || user.status === 'blocked') {
    return;
  }

  // Generate cryptographically secure random token (32 bytes = 64 hex characters)
  const rawResetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token with SHA-256 before persisting in the database
  const hashedResetToken = crypto
    .createHash('sha256')
    .update(rawResetToken)
    .digest('hex');

  // Token expires in 10 minutes
  const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

  // Update user with the hashed token and expiry
  await User.findByIdAndUpdate(user._id, {
    passwordResetToken: hashedResetToken,
    passwordResetExpires: resetExpires,
  });

  // Construct reset URL for the frontend
  const resetPasswordUrl = `${frontendUrl}/auth/reset-password?token=${rawResetToken}&email=${encodeURIComponent(user.email)}`;

  if (envMode === 'development') {
    console.log('--- Development Password Reset Link ---');
    console.log(resetPasswordUrl);
    console.log('----------------------------------------');
  }

  // Send the reset email
  try {
    const mailBody = {
      to: user.email,
      subject: 'CreatifyX - Password Reset Request',
      message: `Click on the link to reset your password: ${resetPasswordUrl}. This link will expire in 10 minutes.`,
      html: passwordResetEmailTemplate(user.name, resetPasswordUrl),
    };
    await sendEmail(mailBody);
  } catch (emailError: any) {
    console.error(
      '⚠️ Email delivery failed:',
      emailError?.message || emailError
    );

    // In development mode, don't fail the entire reset request if local SMTP credentials are not configured or invalid.
    // The developer/tester can use the console-printed link above.
    if (envMode === 'development') {
      console.warn(
        '⚠️ [DEV MODE]: Continuing because ENV_MODE is development. Use the link logged above to test password reset.'
      );
      return;
    }

    // In production, clean up the token so the user can re-request and throw an error.
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: null,
      passwordResetExpires: null,
    });
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send password reset email. Please contact support or try again later.'
    );
  }
};

const resetPasswordHandler = async (
  payload: {
    token: string;
    newPassword: string;
    email?: string;
  },
  ipAddress: string
) => {
  if (!payload.token) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Reset token is required to reset your password!'
    );
  }

  if (!payload.newPassword || payload.newPassword.length < 6) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Password must be at least 6 characters long!'
    );
  }

  // Hash the incoming raw token with SHA-256 to compare with database
  const hashedToken = crypto
    .createHash('sha256')
    .update(payload.token)
    .digest('hex');

  // Look up user by hashed token and verify it has not expired
  let user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+password +passwordResetToken +passwordResetExpires');

  // Fallback for transition: if not found by hash, check if legacy JWT was supplied
  if (!user) {
    try {
      const decoded = verifyJwtToken(payload.token, jwtSecretKey as string);
      if (decoded && decoded.userId) {
        user = await User.findById(decoded.userId).select(
          '+password +passwordResetToken +passwordResetExpires'
        );
      }
    } catch {
      // Not a valid JWT either
    }
  }

  if (!user) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid or expired password reset link. Please request a new one.'
    );
  }

  // If email was provided, verify it matches the user record
  if (
    payload.email &&
    user.email.toLowerCase() !== payload.email.toLowerCase().trim()
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Token is not valid for the provided email address.'
    );
  }

  // Check If the user is deleted or blocked
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      `This account has been deleted! Please contact customer support.`
    );
  } else if (user.status === 'blocked') {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      `This account is blocked! Please contact customer support.`
    );
  }

  // Hash the new password
  const hashedNewPassword = await User.hashPassword(payload.newPassword);

  // Atomically update password, invalidate reset token, record passwordChangedAt timestamp
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      password: hashedNewPassword,
      passwordChangedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordResetIp: ipAddress,
    },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update password! Please try again.'
    );
  }

  // Send a security alert email notifying the user of successful password reset
  try {
    const alertMailBody = {
      to: updatedUser.email,
      subject: 'CreatifyX - Password Reset Successful',
      message: `Your password was successfully reset. IP: ${ipAddress}. If you did not perform this action, please contact support immediately.`,
      html: passwordResetSuccessEmailTemplate(updatedUser.name, ipAddress),
    };
    await sendEmail(alertMailBody);
  } catch (emailError: any) {
    console.warn(
      '⚠️ Failed to send password reset confirmation email:',
      emailError?.message || emailError
    );
  }

  return;
};

export {
  signupHandler,
  registerUserHandler,
  loginHandler,
  verifyOtpHandler,
  logoutHandler,
  changePasswordHandler,
  getRefreshTokenHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
};
