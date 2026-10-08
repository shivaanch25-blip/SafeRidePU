import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '@saferide/shared';

const router = Router();

router.use(requireAuth);

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/history', paymentController.getHistory);
router.get('/all', requireRoles(ROLES.ADMIN), paymentController.getAllPayments);

export default router;
