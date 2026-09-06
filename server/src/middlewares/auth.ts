import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwtService.js';
import { User, IUser } from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { UserRole } from '@saferide/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

// Extend Express Request interface locally to support typing on user and session details
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      token?: string;
    }
  }
}

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Retrieve token from Authorization header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new AppError('Authentication required. Please log in.', 401);
  }

  // 1. Verify token signature
  const decoded = verifyAccessToken(token);

  // 2. Fetch User and verify status
  const user = await User.findById(decoded.userId).select('+password');
  if (!user) {
    throw new AppError('The user belonging to this token no longer exists.', 401);
  }

  // 3. Verify Account locks
  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    throw new AppError(
      `This account is temporarily locked. Please try again after ${user.lockUntil.toLocaleString()}.`,
      403
    );
  }

  // Auto-unlock if lock expiry is in the past
  if (user.lockUntil && user.lockUntil.getTime() <= Date.now()) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  if (user.status === 'Suspended') {
    throw new AppError('This account has been suspended. Please contact campus security.', 403);
  }

  // Bind properties to request scope
  req.user = user;
  req.token = token;
  next();
});

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: You do not have permission to access this resource.', 403));
    }

    next();
  };
};

export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = user;
        req.token = token;
      }
    } catch {
      // Ignore token expiry / failure in optional auth
    }
  }

  next();
});

