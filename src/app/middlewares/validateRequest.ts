import { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod';

const validateRequest = (schema: ZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request using zod. Include files so schemas may validate multipart uploads.
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        files: (req as Request & { files?: unknown }).files,
      } as unknown);
      // If all is ok then send request in controller
      next();
    } catch (error) {
      // If occur any error then send global error handler. Global error handler handle this error!
      next(error);
    }
  };
};

export default validateRequest;
