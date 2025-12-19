import { ErrorRequestHandler } from 'express';
import httpStatus from 'http-status';
import { TErrorSource } from '../interface/error.interface';
import { ZodError } from 'zod';
import zodErrorHandler from '../errors/zodErrorHandler';
import castErrorHandler from '../errors/castErrorHandler';
import duplicateValueError from '../errors/duplicateValueError';
import { envMode } from '../config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Initialize the all errors object property
  let statusCode: number = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let message: string = err.message || 'Something went wrong';
  let errorSources: TErrorSource[] = [
    {
      path: '',
      message: err.message || 'Something went wrong',
    },
  ];
  let stack: string =
    'Error: ' + err.stack?.split('\n')[1]?.trim() || 'No stack trace available';

  // Handle zodError (Validation errors)
  if (err instanceof ZodError) {
    const zodErrors = zodErrorHandler(err);
    const formattedStack = err.stack
      ? err.stack
          .split('\n')
          .filter(line => line.includes('project'))
          .map(line => line.trim())
          .join('\n')
      : 'No stack trace available';

    // Enhanced stack trace formatting for readability
    statusCode = zodErrors.statusCode;
    message = zodErrors.message;
    errorSources = zodErrors.errorSources;
    stack = formattedStack;
    // Handle CastError (Mongoose invalid ObjectId errors)
  } else if (err.name === 'CastError' && err.kind === 'ObjectId') {
    const castError = castErrorHandler(err);

    // Enhanced stack trace formatting for readability
    statusCode = castError.statusCode;
    message = castError.message;
    errorSources = castError.errorSources;

    // Handle Duplicate Key Error (Mongoose duplicate key errors)
  } else if (err.code === 11000) {
    const duplicateError = duplicateValueError(err);

    // Enhanced stack trace formatting
    statusCode = duplicateError.statusCode;
    message = duplicateError.message;
    errorSources = duplicateError.errorSources;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: envMode === 'development' ? stack : null,
  });
};

export default globalErrorHandler;
