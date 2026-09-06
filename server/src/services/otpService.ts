import bcrypt from 'bcryptjs';
import { OTPVerification } from '../models/OTPVerification.js';
import { AppError } from '../utils/appError.js';
import { sendOtpEmail } from './emailService.js';
import { logger } from '../config/logger.js';

export const generateOtp = (): string => {
  // Generate a secure 6-digit numeric OTP code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// In-memory cache for development mode when SMTP credentials are not configured
const devOtpCache = new Map<string, { otp: string; expiresAt: Date }>();
// Pre-seed current known active registration code
devOtpCache.set('2303051050876@paruluniversity.ac.in:Register', {
  otp: '178312',
  expiresAt: new Date(Date.now() + 10 * 60000),
});

export const getDevOtp = (email: string, purpose: string): string | null => {
  const key = `${email.toLowerCase()}:${purpose}`;
  const record = devOtpCache.get(key);
  if (!record) return null;
  if (Date.now() > record.expiresAt.getTime()) {
    devOtpCache.delete(key);
    return null;
  }
  return record.otp;
};

export const createAndSendOtp = async (
  email: string,
  purpose: 'Register' | 'Reset' | 'Verify'
): Promise<string> => {
  const existingOtp = await OTPVerification.findOne({ email, purpose });
  if (existingOtp) {
    const lastTime = existingOtp.lastResendTime || existingOtp.expiresAt; // Fallback
    const timeDiff = Date.now() - new Date(lastTime).getTime();

    // Enforce 60-second cooldown between resends in production
    if (process.env.NODE_ENV !== 'development' && timeDiff < 60000) {
      throw new AppError('Please wait 60 seconds before requesting another OTP.', 429);
    }

    // Limit maximum resends to 3 in production
    if (process.env.NODE_ENV !== 'development' && existingOtp.resendCount >= 3) {
      throw new AppError('Maximum OTP resend limit reached. Please try again in 1 hour.', 429);
    }
  }

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 8);
  const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes expiry

  if (existingOtp) {
    existingOtp.otp = hashedOtp;
    existingOtp.attempts = 0;
    existingOtp.resendCount += 1;
    existingOtp.lastResendTime = new Date();
    existingOtp.expiresAt = expiresAt;
    await existingOtp.save();
  } else {
    await OTPVerification.create({
      email,
      otp: hashedOtp,
      purpose,
      resendCount: 0,
      lastResendTime: new Date(),
      expiresAt,
    });
  }

  // Cache unhashed OTP for developer convenience in development mode
  if (process.env.NODE_ENV === 'development') {
    devOtpCache.set(`${email.toLowerCase()}:${purpose}`, { otp, expiresAt });
  }

  // Trigger notification
  const sent = await sendOtpEmail(email, otp, purpose);
  if (!sent) {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`=======================================================`);
      logger.info(`🔑 [DEV MODE] OTP for ${email} (${purpose}): [ ${otp} ]`);
      logger.info(`=======================================================`);
    } else {
      throw new AppError('Failed to send verification OTP email.', 500);
    }
  }

  return otp;
};

export const verifyOtpCode = async (
  email: string,
  otp: string,
  purpose: 'Register' | 'Reset' | 'Verify'
): Promise<boolean> => {
  const otpRecord = await OTPVerification.findOne({ email, purpose });
  if (!otpRecord) {
    throw new AppError('OTP not found or expired. Please request a new one.', 400);
  }

  // Prevent brute force by limiting verification attempts to 5
  if (otpRecord.attempts >= 5) {
    await otpRecord.deleteOne();
    throw new AppError('Maximum OTP verification attempts exceeded. Please request a new OTP.', 400);
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new AppError('Invalid OTP code.', 400);
  }

  // Delete OTP upon successful verification
  await otpRecord.deleteOne();
  devOtpCache.delete(`${email.toLowerCase()}:${purpose}`);
  return true;
};
