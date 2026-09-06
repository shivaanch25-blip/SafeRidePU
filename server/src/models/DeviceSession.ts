import { Schema, model, Document, Types } from 'mongoose';

export interface IDeviceSession extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  isTrusted: boolean;
  lastActive: Date;
}

const deviceSessionSchema = new Schema<IDeviceSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  deviceName: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  isTrusted: {
    type: Boolean,
    default: false,
  },
  lastActive: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

deviceSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const DeviceSession = model<IDeviceSession>('DeviceSession', deviceSessionSchema);
export default DeviceSession;
