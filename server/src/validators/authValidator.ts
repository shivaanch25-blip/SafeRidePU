import { z } from 'zod';
import { ROLES } from '@saferide/shared';

// Enforce @paruluniversity.ac.in institutional email domain
const institutionalEmailRegex = /^[a-zA-Z0-9._%+-]+@paruluniversity\.ac\.in$/;

// Strong password requirements
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.');

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .refine((val) => institutionalEmailRegex.test(val), {
      message: 'Only Parul University institutional emails (@paruluniversity.ac.in) are permitted.',
    }),
  password: strongPassword,
  firstName: z.string().min(2, 'First name must be at least 2 characters long'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters long'),
  role: z.enum(Object.values(ROLES) as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid user role selection.' }),
  }),
  phoneNumber: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  purpose: z.enum(['Register', 'Reset', 'Verify']),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  purpose: z.enum(['Register', 'Reset', 'Verify']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: strongPassword,
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: strongPassword,
});
