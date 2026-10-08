import { Router } from 'express';
import {
  requestRide,
  getAvailableRides,
  acceptRide,
  updateRideStatus,
  getActiveRide,
  getMyRides,
  getRideById,
  cancelRide,
} from '../controllers/rideController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/request', requestRide);
router.get('/available', getAvailableRides);
router.get('/active', getActiveRide);
router.get('/my-rides', getMyRides);
router.get('/:id', getRideById);
router.patch('/:id/accept', acceptRide);
router.patch('/:id/status', updateRideStatus);
router.patch('/:id/cancel', cancelRide);

export default router;
