/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Response, Request } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/appError';

const notFoundErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  throw new AppError(
    httpStatus.NOT_FOUND,
    'Page Not Found Please Check URL. You lost your track!'
  );
};

export default notFoundErrorHandler;
