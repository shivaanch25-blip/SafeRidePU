import { Schema, model, Document, Types } from 'mongoose';
import { PAYMENT_STATUS, PaymentStatus } from '@saferide/shared';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  rideId?: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number; // in INR rupees
  currency: string;
  status: PaymentStatus;
  method?: string;
  receipt: string;
  notes?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rideId: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    method: {
      type: String,
    },
    receipt: {
      type: String,
      required: true,
    },
    notes: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
export default Payment;
