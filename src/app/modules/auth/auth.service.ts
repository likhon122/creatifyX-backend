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
    html: `<p>Click <a href="${frontendUrl}/verify-email?token=${userJwtToken}">here</a> to verify your email. This link will expire in 5 minutes.</p>`,
  };

  // Send verification email
  sendEmail(mailBody);
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
  sendEmail(mailBody);
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

  // Send a verification email if the user is an author
  if (
    user.role === userRoles.author ||
    user.role === userRoles.admin ||
    user.role === userRoles.super_admin
  ) {
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
    sendEmail(mailBody);

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

  // Update the password
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      password: hashedNewPassword,
      passwordResetExpires: new Date(),
      passwordResetIp: ipAddress,
      passwordResetToken: accessToken,
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

  // Now check if the user change password then we will check The jwt token time is less than the password change time
  if (user.passwordResetExpires || user.passwordResetToken) {
    const isJwtIssuedBeforePassChange = User.isJwtIssuedBeforePasswordChange(
      user.passwordResetExpires as Date,
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
  // Check if the user exists in the database
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found with this email!');
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

  // Generate a password reset token
  const resetToken = createJwtToken(
    { userId: user._id.toString(), role: user.role },
    jwtSecretKey as string,
    '5m'
  );

  // Generate the reset password URL
  const resetPasswordUrl = `${frontendUrl}/reset-password?email=${user.email}&token=${resetToken}`;

  // sent email to the user with nodemailer
  const mailBody = {
    to: user.email,
    subject: 'Password Reset Link',
    message: `Click on the link to reset your password: ${resetPasswordUrl}`,
    html: `<p>Click on the link to reset your password: <a href="${resetPasswordUrl}">Reset Password</a></p>`,
  };
  await sendEmail(mailBody);
  return resetPasswordUrl;
};

const resetPasswordHandler = async (
  payload: {
    email: string;
    newPassword: string;
    token: string;
  },
  ipAddress: string
) => {
  if (!payload.token) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Your are unauthorized to reset your password!'
    );
  }

  // Verify the token
  const decoded = verifyJwtToken(payload.token, jwtSecretKey as string);

  if (!decoded) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid or expired token!');
  }

  // Check if the user exists in the database
  const user = await User.findOne({
    email: payload.email,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found with this ID');
  }

  if (user._id.toString() !== decoded.userId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to reset this user password!'
    );
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

  // Hash the new password
  const hashedNewPassword = await User.hashPassword(payload.newPassword);

  // Update the password
  const updatedUser = await User.findOneAndUpdate(
    { _id: decoded.userId },
    {
      password: hashedNewPassword,
      passwordResetExpires: new Date(),
      passwordResetIp: ipAddress,
      passwordResetToken: payload.token,
    },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update password! Please try again.'
    );
  }

  // Show a reset password success email with full details and ip and info and time of reset
  const mailBody = {
    to: updatedUser.email,
    subject: 'Password Reset Success',
    message: `Your password has been reset successfully!`,
    html: `
      <p>Your password has been reset successfully!</p>
      <p>If you did not perform this action, please contact our support immediately.</p>
      <p><strong>Details of the reset:</strong></p>
      <ul>
        <li><strong>IP Address:</strong> ${ipAddress}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      `,
  };
  await sendEmail(mailBody);

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
