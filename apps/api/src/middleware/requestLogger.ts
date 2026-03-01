/**
 * Request logging middleware
 * Logs method, path, status code, and response time for every API request
 */
import { Request, Response, NextFunction } from 'express';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  const method = req.method;
  const path = req.originalUrl || req.url;
  const ip = getClientIp(req);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji =
      status >= 500 ? '❌' : status >= 400 ? '⚠️' : status >= 300 ? '↪️' : '✅';
    const logLine = `${statusEmoji} ${method} ${path} ${status} ${duration}ms - ${ip}`;
    console.log(logLine);
  });

  next();
}
