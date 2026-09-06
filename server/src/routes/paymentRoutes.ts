import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/history', paymentController.getHistory);

export default router;
