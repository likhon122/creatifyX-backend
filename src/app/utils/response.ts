import { Response } from 'express';

type TSuccessResponse = {
  success: true;
  message: string;
  statusCode: number;
  data: object | [] | string | number | boolean;
  meta?: Record<string, unknown>;
};

const successResponse = (
  res: Response,
  { success, message, statusCode, data, meta }: TSuccessResponse
) => {
  const payload: Record<string, unknown> = {
    success,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  res.status(statusCode).send(payload);
};

export { successResponse };
