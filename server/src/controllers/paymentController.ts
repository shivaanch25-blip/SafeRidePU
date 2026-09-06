import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';
import * as paymentService from '../services/paymentService.js';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const { amount, rideId, notes } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new AppError('Valid payment amount in INR is required.', 400);
    }

    const order = await paymentService.createRazorpayOrder({
      userId: req.user._id.toString(),
      amount,
      rideId,
      notes,
    });

    return sendSuccess(res, order, 'Razorpay order created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, method } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Razorpay order ID, payment ID, and signature are required.', 400);
    }

    const payment = await paymentService.verifyRazorpayPayment({
      userId: req.user._id.toString(),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      method,
    });

    return sendSuccess(res, payment, 'Payment verified and confirmed successfully.');
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const history = await paymentService.getUserPaymentHistory(req.user._id.toString());
    return sendSuccess(res, history, 'Payment history retrieved successfully.');
  } catch (error) {
    next(error);
  }
};
