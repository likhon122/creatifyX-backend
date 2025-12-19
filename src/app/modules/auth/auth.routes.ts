import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import {
  changePasswordValidation,
  forgotPasswordValidationSchema,
  loginSchemaValidation,
  registerUserValidationSchema,
  resetPasswordValidation,
  signupSchemaValidation,
  verifyLoginOtpSchema,
} from './auth.validation';
import {
  changePassword,
  forgotPassword,
  getRefreshToken,
  login,
  logout,
  registerUser,
  resetPassword,
  signup,
  verifyOtp,
} from './auth.controller';
import { userRoles } from '../user/user.constant';
import auth from '../../middlewares/auth';

const authRoutes = Router();

authRoutes.post('/signup', validateRequest(signupSchemaValidation), signup);
authRoutes.post(
  '/register-user',
  validateRequest(registerUserValidationSchema),
  registerUser
);

authRoutes.post('/login', validateRequest(loginSchemaValidation), login);
authRoutes.post(
  '/verify-otp',
  validateRequest(verifyLoginOtpSchema),
  verifyOtp
);

authRoutes.post('/logout', logout);

authRoutes.post(
  '/change-password',
  auth(userRoles.admin, userRoles.subscriber, userRoles.author),
  validateRequest(changePasswordValidation),
  changePassword
);

authRoutes.get('/access-token', getRefreshToken);

authRoutes.post(
  '/forgot-password',
  validateRequest(forgotPasswordValidationSchema),
  forgotPassword
);

authRoutes.post(
  '/reset-password',
  validateRequest(resetPasswordValidation),
  resetPassword
);

export default authRoutes;
