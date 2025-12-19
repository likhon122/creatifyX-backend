import { Request } from 'express';

const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];

  if (typeof xForwardedFor === 'string') {
    return xForwardedFor?.split(',')[0]?.trim(); // First IP is the real one
  }

  if (Array.isArray(xForwardedFor)) {
    return xForwardedFor[0];
  }

  return req.socket?.remoteAddress || req.ip || 'Unknown';
};

export default getClientIp;
