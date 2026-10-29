import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import { TUserRole } from '../modules/user/user.interface';
import AppError from '../errors/appError';
import catchAsync from '../utils/catchAsync';
import { jwtSecretKey } from '../config';
import { User } from '../modules/user/user.model';
import verifyJwtToken from '../utils/verifyJwtToken';
import {
  authorVerificationStatuses,
  userRoles,
} from '../modules/user/user.constant';

const auth = (...roles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Here you can implement your authentication logic

    // Get the token from the request headers
    const token = req.headers?.authorization;

    // Check if the token is present
    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Your are unauthorized to access this resource!'
      );
    }

    // Check if the token is valid
    const isValidToken = verifyJwtToken(token, jwtSecretKey as string);

    if (!isValidToken) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Your are unauthorized to access this resource!'
      );
    }

    // Check if the user has the required role
    if (roles?.length && !roles.includes(isValidToken.role)) {
      if (roles.length === 1 && roles[0] === userRoles.subscriber) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Only subscribers can perform this purchase transaction. Administrators and authors cannot make purchases. Please use a subscriber account.'
        );
      }
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not allowed to access this resource!'
      );
    }

    // Check if the user exists in the database
    const user = await User.isUserExistByCustomId(isValidToken.userId);

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found with this ID');
    }

    if (user.role !== isValidToken.role) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'You are not allowed to access this resource!'
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

    // Check author verification status for authors
    if (
      user.role === userRoles.author &&
      user.authorVerificationStatus !== authorVerificationStatuses.active
    ) {
      if (
        user.authorVerificationStatus === authorVerificationStatuses.not_started
      ) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'You have not started the author verification process. Please complete the verification to continue.'
        );
      }
      if (
        user.authorVerificationStatus === authorVerificationStatuses.suspended
      ) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'Your author account verification was suspended. Please contact support for more information.'
        );
      }
      if (
        user.authorVerificationStatus === authorVerificationStatuses.pending
      ) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'Your author account is not verified yet. Please wait for the verification.'
        );
      }
    }

    // Check if the user changed password; if token was issued before the change, invalidate it
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

    // Attach the user to the request object
    req.user = isValidToken as jwt.JwtPayload;

    next();
  });
};

export default auth;
