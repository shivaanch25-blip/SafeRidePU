import { Request, Response, NextFunction } from 'express';
import { processChatMessage } from '../services/chatbotService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';

export const sendChatMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('Message text is required', 400);
    }

    const reply = await processChatMessage(message.trim(), history || []);

    return sendSuccess(
      res,
      {
        reply,
        timestamp: new Date(),
      },
      'AI response generated successfully'
    );
  } catch (error) {
    next(error);
  }
};
