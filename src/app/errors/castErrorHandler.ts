import httpStatus from 'http-status';
import { CastError } from 'mongoose';
import { TGenericErrorReturnType } from '../interface/error.interface';

const castErrorHandler = (err: CastError): TGenericErrorReturnType => {
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: `Invalid ${err.path}: "${err.value}". Please provide a valid ID.`,
    errorSources: [
      {
        path: err.path ? err.path : '',
        message: `Invalid ${err.value}: for ${err.path}. Expected a valid ObjectId.`,
      },
    ],
  };
};

export default castErrorHandler;
