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

  // Handle MongoDB Duplicate Key (E11000)
  if ('code' in err && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0] || 'field';
    return res.status(400).json({
      status: 'fail',
      message: `An account with this ${field} already exists.`,
    });
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }

  // Fallback production error message with safe details
  return res.status(statusCode || 500).json({
    status: 'error',
    message: err.message || 'An unexpected system error occurred.',
  });
};
