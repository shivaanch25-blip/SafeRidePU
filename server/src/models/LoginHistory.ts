import { Schema, model, Document, Types } from 'mongoose';

export interface ILoginHistory extends Document {
  userId: Types.ObjectId;
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  loginTime: Date;
  logoutTime?: Date;
}

const loginHistorySchema = new Schema<ILoginHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  browser: {
    type: String,
    required: true,
  },
  os: {
    type: String,
    required: true,
  },
  device: {
    type: String,
    required: true,
  },
  loginTime: {
    type: Date,
    default: Date.now,
    required: true,
  },
  logoutTime: {
    type: Date,
  },
});

export const LoginHistory = model<ILoginHistory>('LoginHistory', loginHistorySchema);
export default LoginHistory;
