import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { sendSuccess } from '../utils/response.js';
import { createAndSendOtp, verifyOtpCode, getDevOtp as getDevOtpService } from '../services/otpService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../services/jwtService.js';
import {
  registerDeviceSession,
  getActiveSessions,
  revokeSession as dbRevokeSession,
  revokeAllSessions,
} from '../services/sessionService.js';
import { logAuditEvent } from '../services/auditService.js';
import { sendAccountLockedEmail } from '../services/emailService.js';
import { logger } from '../config/logger.js';
import { isDbConnected } from '../config/db.js';

export interface IInMemoryUser {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber?: string;
  isVerified: boolean;
  status: string;
  profileCompleted: boolean;
}

export const inMemoryUsers: IInMemoryUser[] = [
  {
    _id: 'usr_seed_shivani',
    email: '2303051050876@paruluniversity.ac.in',
    password: '',
    firstName: 'Shivani',
    lastName: 'Kumari',
    role: 'Rider',
    phoneNumber: '+918299047221',
    isVerified: true,
    status: 'Active',
    profileCompleted: true,
  },
];

// Helper to set token cookies safely
const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Helper to clear token cookies
const clearTokenCookies = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('accessToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
};

// 1. User Registration
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    // Offline in-memory fallback if MongoDB is not connected locally
    if (!isDbConnected()) {
      logger.info(`[OFFLINE DEMO MODE] Registering user ${email} in memory.`);
      const existing = inMemoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      const otp = await createAndSendOtp(email, 'Register');

      if (existing) {
        if (existing.isVerified) {
          throw new AppError('An account with this email address already exists. Please log in.', 400);
        }
        return sendSuccess(res, { email, devOtp: otp }, 'A verification OTP has been sent to your email.');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      inMemoryUsers.push({
        _id: `usr_demo_${Date.now()}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        phoneNumber,
        isVerified: false,
        status: 'Inactive',
        profileCompleted: false,
      });

      return sendSuccess(
        res,
        { email, devOtp: otp },
        'Registration initiated. Please verify the OTP sent to your email.',
        201
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        throw new AppError('An account with this email address already exists.', 400);
      }
      // If user registered but did not verify OTP, resend verification OTP code
      const otp = await createAndSendOtp(email, 'Register');
      return sendSuccess(
        res,
        { email, devOtp: otp },
        'A verification OTP has been sent to your email.'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      phoneNumber,
      isVerified: false,
      status: 'Inactive',
      passwordHistory: [hashedPassword],
    });

    const otp = await createAndSendOtp(email, 'Register');

    await logAuditEvent({
      userId: newUser._id.toString(),
      event: 'USER_REGISTER_INITIATED',
      status: 'SUCCESS',
      description: `Registration initiated for email ${email}`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return sendSuccess(
      res,
      { email, devOtp: otp },
      'Registration initiated. Please verify the OTP sent to your email.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// 2. OTP Verification
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, purpose } = req.body;

    await verifyOtpCode(email, otp, purpose);

    // Offline in-memory fallback if MongoDB is not connected locally
    if (!isDbConnected()) {
      const user = inMemoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new AppError('User account not found.', 404);
      }
      if (purpose === 'Register') {
        user.isVerified = true;
        user.status = 'Active';
        return sendSuccess(res, null, 'Email verified successfully. You can now log in.');
      }
      return sendSuccess(res, null, 'OTP verified successfully.');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    if (purpose === 'Register') {
      user.isVerified = true;
      user.status = 'Active';
      await user.save();

      await logAuditEvent({
        userId: user._id.toString(),
        event: 'USER_EMAIL_VERIFIED',
        status: 'SUCCESS',
        description: `OTP verification successful. Account activated.`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      return sendSuccess(res, null, 'Email verified successfully. You can now log in.');
    }

    if (purpose === 'Reset') {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.forgotPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.forgotPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
      await user.save();

      await logAuditEvent({
        userId: user._id.toString(),
        event: 'PASSWORD_RESET_OTP_VERIFIED',
        status: 'SUCCESS',
        description: `Reset OTP verified. Code generated.`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      return sendSuccess(res, { resetToken }, 'OTP verified. Please proceed to reset your password.');
    }

    return sendSuccess(res, null, 'OTP verified successfully.');
  } catch (error) {
    next(error);
  }
};

// 3. Resend OTP
export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, purpose } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('No account found with this email.', 404);
    }

    const otp = await createAndSendOtp(email, purpose);

    await logAuditEvent({
      userId: user._id.toString(),
      event: 'OTP_RESENT',
      status: 'SUCCESS',
      description: `OTP resent for purpose: ${purpose}`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return sendSuccess(
      res,
      { email, devOtp: otp },
      'A new verification OTP has been sent to your email.'
    );
  } catch (error) {
    next(error);
  }
};

// 4. User Login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Offline in-memory fallback if MongoDB is not connected locally
    if (!isDbConnected()) {
      const user = inMemoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new AppError('Invalid email or password.', 401);
      }
      if (!user.password) {
        user.password = await bcrypt.hash(password, 12);
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new AppError('Invalid email or password.', 401);
      }
      if (!user.isVerified) {
        throw new AppError('Your account email has not been verified yet.', 403);
      }

      const accessToken = generateAccessToken({ userId: user._id, role: user.role });
      let refreshToken = 'mock_refresh_token';
      try {
        refreshToken = await generateRefreshToken(user._id, user.role);
      } catch {
        refreshToken = `mock_rf_${Date.now()}`;
      }
      setTokenCookies(res, accessToken, refreshToken);

      return sendSuccess(
        res,
        {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            profileCompleted: user.profileCompleted,
          },
          accessToken,
        },
        'Login successful.'
      );
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Check account status locks
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      throw new AppError(
        `This account is temporarily locked due to failed login attempts. Please try again after ${user.lockUntil.toLocaleString()}.`,
        403
      );
    }

    if (!user.isVerified) {
      await createAndSendOtp(email, 'Register');
      throw new AppError('Your email address has not been verified. A verification OTP has been sent.', 403);
    }

    if (user.status === 'Suspended') {
      throw new AppError('This account has been suspended. Please contact university security.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      user.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lock
        await user.save();

        await sendAccountLockedEmail(user.email, user.lockUntil.toLocaleString()).catch((err) =>
          logger.error('Failed to send lock email notification:', err)
        );

        await logAuditEvent({
          userId: user._id.toString(),
          event: 'ACCOUNT_LOCKED',
          status: 'FAILURE',
          description: `Account temporarily locked due to 5 failed login attempts.`,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        });

        throw new AppError('Maximum login attempts exceeded. Your account is locked for 15 minutes.', 403);
      }

      await user.save();

      await logAuditEvent({
        userId: user._id.toString(),
        event: 'LOGIN_ATTEMPT_FAILED',
        status: 'FAILURE',
        description: `Failed login attempt. Count: ${user.failedLoginAttempts}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      throw new AppError('Invalid email or password.', 401);
    }

    // Success: reset locks and attempts
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = await generateRefreshToken(user._id.toString(), user.role);

    // Track Device sessions
    let deviceId = req.cookies.deviceId || req.headers['x-device-id'];
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      res.cookie('deviceId', deviceId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    }

    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceName = userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser';

    await registerDeviceSession({
      userId: user._id.toString(),
      deviceId,
      deviceName,
      ipAddress: req.ip || 'unknown',
      userAgent,
      email: user.email,
    });

    setTokenCookies(res, accessToken, refreshToken);

    await logAuditEvent({
      userId: user._id.toString(),
      event: 'USER_LOGIN_SUCCESS',
      status: 'SUCCESS',
      description: `User login successful from device: ${deviceName}`,
      ipAddress: req.ip || 'unknown',
      userAgent,
    });

    // Mask sensitive fields
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileCompleted: user.profileCompleted,
    };

    return sendSuccess(res, { user: userResponse, accessToken }, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

// 5. User Logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    clearTokenCookies(res);

    if (req.user) {
      await logAuditEvent({
        userId: req.user._id.toString(),
        event: 'USER_LOGOUT',
        status: 'SUCCESS',
        description: `Logged out successfully.`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
    }

    return sendSuccess(res, null, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

// 6. Logout all devices
export const logoutAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const userId = req.user._id.toString();
    await revokeAllUserTokens(userId);
    await revokeAllSessions(userId);
    clearTokenCookies(res);

    await logAuditEvent({
      userId,
      event: 'USER_LOGOUT_ALL_DEVICES',
      status: 'SUCCESS',
      description: `Logged out from all device sessions.`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return sendSuccess(res, null, 'Logged out from all devices successfully.');
  } catch (error) {
    next(error);
  }
};

// 7. Rotate refresh tokens
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      throw new AppError('Session expired. Please log in again.', 401);
    }

    const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(token);

    setTokenCookies(res, accessToken, newRefreshToken);

    return sendSuccess(res, { accessToken }, 'Token refreshed successfully.');
  } catch (error) {
    clearTokenCookies(res);
    next(error);
  }
};

// 8. Forgot Password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Obfuscate response to prevent user enumeration attacks
      return sendSuccess(res, null, 'If that email address exists in our database, we have sent a verification OTP.');
    }

    const otp = await createAndSendOtp(email, 'Reset');

    await logAuditEvent({
      userId: user._id.toString(),
      event: 'PASSWORD_RESET_REQUESTED',
      status: 'SUCCESS',
      description: `Reset OTP email dispatched.`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return sendSuccess(
      res,
      process.env.NODE_ENV === 'development' ? { devOtp: otp } : null,
      'If that email address exists in our database, we have sent a verification OTP.'
    );
  } catch (error) {
    next(error);
  }
};

// 9. Reset Password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      throw new AppError('Password reset link is invalid or has expired.', 400);
    }

    // Enforce password history (prevent reusing current or previous 3 passwords)
    for (const historicPassword of user.passwordHistory) {
      const isMatch = await bcrypt.compare(password, historicPassword);
      if (isMatch) {
        throw new AppError('You cannot reuse a password you have used recently.', 400);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpires = undefined;

    // Shift password history, keep last 3
    user.passwordHistory.push(hashedPassword);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }

    await user.save();

    await logAuditEvent({
      userId: user._id.toString(),
      event: 'PASSWORD_RESET_SUCCESSFUL',
      status: 'SUCCESS',
      description: `Password reset successfully via reset token.`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return sendSuccess(res, null, 'Password reset successfully. You can now log in.');
  } catch (error) {
    next(error);
  }
};

// 10. Change Password (In-App)
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password || '');
    if (!isMatch) {
      throw new AppError('Your current password was entered incorrectly.', 400);
    }

    // Check reuse in password history
    for (const historicPassword of user.passwordHistory) {
      const isHistoricMatch = await bcrypt.compare(newPassword, historicPassword);
      if (isHistoricMatch) {
        throw new AppError('You cannot reuse a password you have used recently.', 400);
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    // Shift password history, keep last 3
    user.passwordHistory.push(hashedPassword);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }

    await user.save();

    await logAuditEvent({
      userId: user._id.toString(),
      event: 'PASSWORD_CHANGED_IN_APP',
      status: 'SUCCESS',
      description: `Password updated successfully inside app dashboard settings.`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return sendSuccess(res, null, 'Password changed successfully.');
  } catch (error) {
    next(error);
  }
};

// 11. Retrieve active devices list
export const listSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const sessions = await getActiveSessions(req.user._id.toString());
    return sendSuccess(res, sessions, 'Active sessions retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

// 12. Terminate session
export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const { id } = req.params;
    await dbRevokeSession(req.user._id.toString(), id);

    await logAuditEvent({
      userId: req.user._id.toString(),
      event: 'DEVICE_SESSION_REVOKED',
      status: 'SUCCESS',
      description: `Active session with ID ${id} was revoked remotely.`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return sendSuccess(res, null, 'Session terminated successfully.');
  } catch (error) {
    next(error);
  }
};

// 13. Get Current User Profile Info
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      profileCompleted: req.user.profileCompleted,
    };

    return sendSuccess(res, { user: userResponse }, 'Current user profile retrieved.');
  } catch (error) {
    next(error);
  }
};

// 14. Dev Mode Helper to fetch OTP without checking console
export const getDevOtp = async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.trim();
  const purpose = ((req.query.purpose as string) || 'Register').trim();

  if (!email) {
    return res.status(400).json({ status: 'fail', message: 'Email query parameter is required' });
  }

  const otp = getDevOtpService(email, purpose);
  return sendSuccess(res, { otp }, 'Dev OTP retrieved');
};

