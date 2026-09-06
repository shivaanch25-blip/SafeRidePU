import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';

// Setup Nodemailer SMTP transport using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    logger.warn('Nodemailer SMTP mailer not fully connected: ' + error.message);
  } else {
    logger.info('SMTP Mailer service ready.');
  }
});

interface IMailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendMail = async (options: IMailOptions): Promise<boolean> => {
  try {
    const from = process.env.SMTP_FROM || 'noreply@saferidepu.edu';
    await transporter.sendMail({
      from: `"SafeRide PU" <${from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    logger.error('Email sending failed:', error);
    return false;
  }
};

export const sendOtpEmail = async (email: string, otp: string, purpose = 'Register'): Promise<boolean> => {
  const subject = `SafeRide PU - OTP for ${purpose}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4ecf5; border-radius: 12px;">
      <h2 style="color: #3561a3; text-align: center;">SafeRide PU Verification</h2>
      <p>Hello,</p>
      <p>Thank you for using SafeRide PU. Please use the following One-Time Password (OTP) to complete your <strong>${purpose}</strong> request:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3561a3; padding: 10px 20px; background-color: #f5f7fa; border-radius: 8px; border: 1px dashed #c8daf0;">
          ${otp}
        </span>
      </div>
      <p>This code will expire in 10 minutes. If you did not make this request, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e4ecf5; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9cbce5; text-align: center;">&copy; SafeRide PU - Secure Campus Rides</p>
    </div>
  `;
  return sendMail({ to: email, subject, html });
};

export const sendForgotPasswordEmail = async (email: string, resetUrl: string): Promise<boolean> => {
  const subject = 'SafeRide PU - Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4ecf5; border-radius: 12px;">
      <h2 style="color: #3561a3; text-align: center;">SafeRide PU Password Reset</h2>
      <p>Hello,</p>
      <p>We received a request to reset the password for your SafeRide PU account. You can reset your password by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3561a3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #3561a3;">${resetUrl}</p>
      <p>This link is valid for 1 hour. If you did not request a password reset, please ignore this message.</p>
      <hr style="border: 0; border-top: 1px solid #e4ecf5; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9cbce5; text-align: center;">&copy; SafeRide PU - Secure Campus Rides</p>
    </div>
  `;
  return sendMail({ to: email, subject, html });
};

export const sendAccountLockedEmail = async (email: string, unlockTimeStr: string): Promise<boolean> => {
  const subject = 'SafeRide PU - Account Temporarily Locked';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4ecf5; border-radius: 12px;">
      <h2 style="color: #d97706; text-align: center;">Security Alert: Account Temporarily Locked</h2>
      <p>Hello,</p>
      <p>Your SafeRide PU account has been temporarily locked due to multiple failed login attempts.</p>
      <p>For security purposes, you will not be able to log in until: <strong>${unlockTimeStr}</strong>.</p>
      <p>If this was not you, please contact the University Security Office immediately to secure your account.</p>
      <hr style="border: 0; border-top: 1px solid #e4ecf5; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9cbce5; text-align: center;">&copy; SafeRide PU - Secure Campus Rides</p>
    </div>
  `;
  return sendMail({ to: email, subject, html });
};

export const sendNewDeviceLoginEmail = async (
  email: string,
  deviceDetails: { name: string; ip: string; time: string }
): Promise<boolean> => {
  const subject = 'SafeRide PU - New Login Alert';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4ecf5; border-radius: 12px;">
      <h2 style="color: #3561a3; text-align: center;">New Login Detected</h2>
      <p>Hello,</p>
      <p>We detected a new login to your SafeRide PU account from a device we do not recognize:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e4ecf5; font-weight: bold;">Device:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e4ecf5;">${deviceDetails.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e4ecf5; font-weight: bold;">IP Address:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e4ecf5;">${deviceDetails.ip}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e4ecf5; font-weight: bold;">Time:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e4ecf5;">${deviceDetails.time}</td>
        </tr>
      </table>
      <p>If this was you, no action is required. If this was suspicious, please change your password immediately.</p>
      <hr style="border: 0; border-top: 1px solid #e4ecf5; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9cbce5; text-align: center;">&copy; SafeRide PU - Secure Campus Rides</p>
    </div>
  `;
  return sendMail({ to: email, subject, html });
};
