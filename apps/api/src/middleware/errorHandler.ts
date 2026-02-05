// Error handling middleware

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  res.status(500).json({
    status: false,
    message: err.message || 'Internal server error',
    errorcode: 'INTERNAL_ERROR',
  });
};

