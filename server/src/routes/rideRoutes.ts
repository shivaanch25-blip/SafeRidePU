import { Router } from 'express';
import {
  requestRide,
  getAvailableRides,
  acceptRide,
  rejectRide,
  updateRideStatus,
  getActiveRide,
  getMyRides,
  getRideById,
  cancelRide,
} from '../controllers/rideController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '@saferide/shared';

const router = Router();

router.use(requireAuth);

router.post('/request', requireRoles(ROLES.RIDER, ROLES.ADMIN), requestRide);
router.get('/available', requireRoles(ROLES.DRIVER, ROLES.ADMIN), getAvailableRides);
router.get('/active', getActiveRide);
router.get('/my-rides', getMyRides);
router.get('/:id', getRideById);
router.patch('/:id/accept', requireRoles(ROLES.DRIVER, ROLES.ADMIN), acceptRide);
router.patch('/:id/reject', requireRoles(ROLES.DRIVER, ROLES.ADMIN), rejectRide);
router.patch('/:id/status', requireRoles(ROLES.DRIVER, ROLES.ADMIN), updateRideStatus);
router.patch('/:id/cancel', cancelRide);

export default router;
