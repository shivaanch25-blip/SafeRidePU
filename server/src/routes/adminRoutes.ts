import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  updateUserStatus,
  getAdminRides,
  getAdminSosAlerts,
  resolveSosAlert,
} from '../controllers/adminController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/rides', getAdminRides);
router.get('/sos-alerts', getAdminSosAlerts);
router.patch('/sos-alerts/:id/resolve', resolveSosAlert);

export default router;
