import { Router } from 'express';
import * as sosController from '../controllers/sosController.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = Router();

// Public / Authenticated SOS endpoints
router.post('/alert', optionalAuth, sosController.triggerSOSAlert);
router.post('/resolve', optionalAuth, sosController.resolveSOSAlert);
router.get('/active', optionalAuth, sosController.getActiveAlerts);

export default router;
