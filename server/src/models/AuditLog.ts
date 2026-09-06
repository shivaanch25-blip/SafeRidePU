import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: Types.ObjectId;
  event: string;
  status: 'SUCCESS' | 'FAILURE';
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  event: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE'],
    required: true,
  },
  description: {
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
  metadata: {
    type: Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
