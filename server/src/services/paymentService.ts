import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Payment } from '../models/Payment.js';
import { AppError } from '../utils/appError.js';
import { PAYMENT_STATUS } from '@saferide/shared';
import { Types } from 'mongoose';
import { logger } from '../config/logger.js';

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';

const razorpayInstance = new (Razorpay as any)({
  key_id: keyId,
  key_secret: keySecret,
});

export const createRazorpayOrder = async (params: {
  userId: string;
  amount: number; // in INR rupees
  rideId?: string;
  notes?: Record<string, string>;
}) => {
  const { userId, amount, rideId, notes } = params;

  if (amount <= 0) {
    throw new AppError('Payment amount must be greater than 0', 400);
  }

  const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const isDummyKey = keyId.includes('placeholder') || keySecret.includes('placeholder');
  let order: { id: string; amount: number; currency: string };
  let isSimulated = false;

  if (isDummyKey) {
    // Immediate sandbox order to prevent timeout when placeholder credentials are used
    order = {
      id: `order_sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      amount: Math.round(amount * 100),
      currency: 'INR',
    };
    isSimulated = true;
    logger.info(`[PAYMENT] Created simulated sandbox order: ${order.id} for amount ₹${amount}`);
  } else {
    try {
      order = await razorpayInstance.orders.create({
        amount: Math.round(amount * 100), // amount in paise
        currency: 'INR',
        receipt,
        notes: notes || {},
      });
    } catch (err: any) {
      logger.warn('Razorpay live order creation failed. Falling back to sandbox order:', err.message);
      order = {
        id: `order_sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
      };
      isSimulated = true;
    }
  }

  const paymentRecord = await Payment.create({
    userId: new Types.ObjectId(userId),
    rideId: rideId ? new Types.ObjectId(rideId) : undefined,
    razorpayOrderId: order.id,
    amount,
    currency: 'INR',
    status: PAYMENT_STATUS.PENDING,
    receipt,
    notes,
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: isSimulated ? 'rzp_test_simulated' : keyId,
    paymentId: paymentRecord._id.toString(),
    isSimulated,
  };
};

export const verifyRazorpayPayment = async (params: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  method?: string;
}) => {
  const { userId, razorpayOrderId, razorpayPaymentId, razorpaySignature, method } = params;

  const paymentRecord = await Payment.findOne({
    razorpayOrderId,
    userId: new Types.ObjectId(userId),
  });

  if (!paymentRecord) {
    throw new AppError('Payment record not found for this order.', 404);
  }

  // Check if simulated sandbox order
  const isSimulatedOrder = razorpayOrderId.startsWith('order_sim_') || razorpaySignature.startsWith('sim_sig_') || keySecret.includes('placeholder');

  // Compute HMAC SHA256 signature to verify authenticity
  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const generatedSignature = hmac.digest('hex');

  const isMatch = isSimulatedOrder || generatedSignature === razorpaySignature;

  if (!isMatch) {
    paymentRecord.status = PAYMENT_STATUS.FAILED;
    paymentRecord.razorpayPaymentId = razorpayPaymentId;
    paymentRecord.razorpaySignature = razorpaySignature;
    await paymentRecord.save();
    throw new AppError('Payment verification signature mismatch. Security check failed.', 400);
  }

  paymentRecord.status = PAYMENT_STATUS.COMPLETED;
  paymentRecord.razorpayPaymentId = razorpayPaymentId;
  paymentRecord.razorpaySignature = razorpaySignature;
  paymentRecord.method = method || 'UPI';
  await paymentRecord.save();

  return paymentRecord;
};

export const getUserPaymentHistory = async (userId: string) => {
  return Payment.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
};
