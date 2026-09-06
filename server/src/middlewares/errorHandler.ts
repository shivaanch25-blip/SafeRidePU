import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { logger } from '../config/logger.js';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const status = 'status' in err ? err.status : 'error';

  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack || '');
  }

  // Development response
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // Production response
  if ('isOperational' in err && err.isOperational) {
    return res.status(statusCode).json({
      status,
      message: err.message,
    });
  }

  // Unknown programming error: mask message
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected system error occurred.',
  });
};
