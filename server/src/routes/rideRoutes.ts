import { Router } from 'express';
import {
  requestRide,
  getAvailableRides,
  acceptRide,
  updateRideStatus,
  getActiveRide,
  getMyRides,
} from '../controllers/rideController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/request', requestRide);
router.get('/available', getAvailableRides);
router.get('/active', getActiveRide);
router.get('/my-rides', getMyRides);
router.patch('/:id/accept', acceptRide);
router.patch('/:id/status', updateRideStatus);

export default router;
