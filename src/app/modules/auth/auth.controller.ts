import { envMode } from '../../config';
import httpStatus from '../../constant/httpStatus';
import catchAsync from '../../utils/catchAsync';
import getClientIp from '../../utils/getClientIp';
import { successResponse } from '../../utils/response';
import {
  changePasswordHandler,
  forgotPasswordHandler,
  getRefreshTokenHandler,
  loginHandler,
  logoutHandler,
  registerUserHandler,
  resetPasswordHandler,
  signupHandler,
  verifyOtpHandler,
} from './auth.service';

const signup = catchAsync(async (req, res) => {
  const result = await signupHandler(req.body);

  successResponse(res, {
    success: true,
    message:
      'We sent a verification email to your email address. Please verify your email to complete the signup process.',
    statusCode: httpStatus.OK,
    data: result,
  });
});

const registerUser = catchAsync(async (req, res) => {
  const result = await registerUserHandler(req.body);

  // Set Refresh Token in the cookie
  res.cookie('refreshToken', result.refreshToken, {
    secure: envMode === 'production',
    sameSite: envMode === 'production' ? 'strict' : 'lax',
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  });

  successResponse(res, {
    success: true,
    message: 'User registered successfully!',
    statusCode: httpStatus.CREATED,
    data: {
      userInfo: result.user,
      accessToken: result.accessToken,
    },
  });
});

const login = catchAsync(async (req, res) => {
  const result = await loginHandler(req.body);

  if (result.refreshToken) {
    // Set Refresh Token in the cookie
    res.cookie('refreshToken', result.refreshToken, {
      secure: envMode === 'production',
      sameSite: envMode === 'production' ? 'strict' : 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }

  if (result.otp) {
    return successResponse(res, {
      success: true,
      message:
        'Please verify the OTP sent to your email to complete the login process. The OTP will expire in 5 minutes.',
      statusCode: httpStatus.OK,
      data: {
        otp: result.otp,
      },
    });
  } else {
    return successResponse(res, {
      success: true,
      message: 'Login successful!',
      statusCode: httpStatus.OK,
      data: {
        userInfo: result.user,
        accessToken: result.accessToken,
      },
    });
  }
});

const verifyOtp = catchAsync(async (req, res) => {
  const result = await verifyOtpHandler(req.body);

  // Set Refresh Token in the cookie
  res.cookie('refreshToken', result.refreshToken, {
    secure: envMode === 'production',
    sameSite: envMode === 'production' ? 'strict' : 'lax',
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  });

  successResponse(res, {
    success: true,
    message: 'OTP verified successfully!',
    statusCode: httpStatus.OK,
    data: {
      userInfo: result.user,
      accessToken: result.accessToken,
    },
  });
});

const logout = catchAsync(async (req, res) => {
  const cookies = req.cookies;
  await logoutHandler(cookies);
  res.clearCookie('refreshToken', {
    secure: envMode === 'production',
    sameSite: envMode === 'production' ? 'strict' : 'lax',
    maxAge: 0,
  });
  successResponse(res, {
    success: true,
    message: 'Logout successful!',
    statusCode: httpStatus.OK,
    data: {},
  });
});

const changePassword = catchAsync(async (req, res) => {
  const userId = req.user.userId;

  // Get the ip address from the request
  const ipAddress = getClientIp(req);
  // Get user access Token
  const accessToken = req.headers.authorization;

  const result = await changePasswordHandler(
    req.body,
    userId,
    ipAddress,
    accessToken
  );

  successResponse(res, {
    success: true,
    message: 'Password changed successfully',
    statusCode: 200,
    data: result,
  });
});

const getRefreshToken = catchAsync(async (req, res) => {
  const cookies = req.cookies;
  const result = await getRefreshTokenHandler(cookies);
  successResponse(res, {
    success: true,
    message: 'Access token generated successfully',
    statusCode: httpStatus.OK,
    data: {
      accessToken: result.accessToken,
    },
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  // Call the service to handle forgot password logic
  const result = await forgotPasswordHandler(req.body.email);

  successResponse(res, {
    success: true,
    message: 'Password reset link sent to your! Please check your email.',
    statusCode: 200,
    data: { result },
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const ip = getClientIp(req);
  await resetPasswordHandler(req.body, ip);

  successResponse(res, {
    success: true,
    message: 'Password reset successfully',
    statusCode: 200,
    data: {},
  });
});

export {
  signup,
  registerUser,
  login,
  verifyOtp,
  logout,
  changePassword,
  getRefreshToken,
  forgotPassword,
  resetPassword,
};
