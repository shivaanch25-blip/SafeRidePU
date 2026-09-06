import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/authValidator.js';

const router = Router();

// Public auth endpoints
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/verify-otp', validateRequest(verifyOtpSchema), authController.verifyOtp);
router.post('/resend-otp', validateRequest(resendOtpSchema), authController.resendOtp);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);
router.get('/dev-otp', authController.getDevOtp);

// Protected auth endpoints
router.get('/me', requireAuth, authController.getMe);
router.post('/change-password', requireAuth, validateRequest(changePasswordSchema), authController.changePassword);
router.post('/logout-all', requireAuth, authController.logoutAll);
router.get('/sessions', requireAuth, authController.listSessions);
router.delete('/sessions/:id', requireAuth, authController.revokeSession);


export default router;
