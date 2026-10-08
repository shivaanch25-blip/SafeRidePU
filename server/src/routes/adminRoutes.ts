import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  updateUserStatus,
  getAdminRides,
  getAdminSosAlerts,
  resolveSosAlert,
  registerDriver,
  getAdminSessions,
  revokeAdminSession,
  getAdminPayments,
} from '../controllers/adminController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '@saferide/shared';

const router = Router();

// Strictly authenticate and authorize Admin role for all admin operations
router.use(requireAuth);
router.use(requireRoles(ROLES.ADMIN, ROLES.SECURITY_OFFICE));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', updateUserStatus);
router.post('/drivers', registerDriver);
router.get('/rides', getAdminRides);
router.get('/sos-alerts', getAdminSosAlerts);
router.patch('/sos-alerts/:id/resolve', resolveSosAlert);
router.get('/sessions', getAdminSessions);
router.delete('/sessions/:id', revokeAdminSession);
router.get('/payments', getAdminPayments);

export default router;
