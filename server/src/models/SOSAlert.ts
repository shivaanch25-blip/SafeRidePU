import { Schema, model, Document, Types } from 'mongoose';

export interface ISOSAlert extends Document {
  userId?: Types.ObjectId;
  riderName: string;
  riderEmail: string;
  riderPhone?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  status: 'ACTIVE' | 'RESOLVED';
  emergencyContactsNotified: boolean;
  notes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const sosAlertSchema = new Schema<ISOSAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    riderName: {
      type: String,
      required: true,
      default: 'Parul University Rider',
    },
    riderEmail: {
      type: String,
      required: true,
    },
    riderPhone: {
      type: String,
      default: 'Unknown',
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Parul University Waghodia Campus Area' },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE',
    },
    emergencyContactsNotified: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

sosAlertSchema.index({ status: 1, createdAt: -1 });

export const SOSAlert = model<ISOSAlert>('SOSAlert', sosAlertSchema);
export default SOSAlert;
