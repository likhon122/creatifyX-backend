/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from '../constant/httpStatus';
import { TGenericErrorReturnType } from '../interface/error.interface';

const duplicateValueError = (err: any): TGenericErrorReturnType => {
  const duplicateField = Object.keys(err.keyValue)[0];
  const duplicateValue = err.keyValue[duplicateField];

  return {
    statusCode: httpStatus.CONFLICT,
    message: `Duplicate value error: The ${duplicateField} ${duplicateValue} is already registered in the database.`,
    errorSources: [
      {
        path: '',
        message: `The ${duplicateField} ${duplicateValue} is already registered.`,
      },
    ],
  };
};

export default duplicateValueError;
