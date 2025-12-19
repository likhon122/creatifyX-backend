import { ZodError } from 'zod';
import { TGenericErrorReturnType } from '../interface/error.interface';
import httpStatus from '../constant/httpStatus';

const zodErrorHandler = (err: ZodError): TGenericErrorReturnType => {
  const zodErrors = err.issues.map(issue => ({
    path: issue.path?.join('.'),
    message: issue.message,
  }));

  // Enhanced stack trace formatting for readability
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Validation Error',
    errorSources: zodErrors,
  };
};

export default zodErrorHandler;
