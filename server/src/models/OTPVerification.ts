import { Schema, model, Document } from 'mongoose';

export interface IOTPVerification extends Document {
  email: string;
  otp: string;
  attempts: number;
  purpose: 'Register' | 'Reset' | 'Verify';
  resendCount: number;
  lastResendTime?: Date;
  expiresAt: Date;
}

const otpVerificationSchema = new Schema<IOTPVerification>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  purpose: {
    type: String,
    enum: ['Register', 'Reset', 'Verify'],
    default: 'Register',
  },
  resendCount: {
    type: Number,
    default: 0,
  },
  lastResendTime: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Configure TTL index to automatically prune expired OTP documents
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpVerificationSchema.index({ email: 1, purpose: 1 });

export const OTPVerification = model<IOTPVerification>('OTPVerification', otpVerificationSchema);
export default OTPVerification;
