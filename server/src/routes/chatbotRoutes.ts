import { Router } from 'express';
import * as chatbotController from '../controllers/chatbotController.js';

const router = Router();

router.post('/message', chatbotController.sendChatMessage);

export default router;
