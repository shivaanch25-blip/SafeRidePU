import { AuditLog } from '../models/AuditLog.js';
import { Types } from 'mongoose';
import { logger } from '../config/logger.js';

export const logAuditEvent = async (params: {
  userId?: string | Types.ObjectId;
  event: string;
  status: 'SUCCESS' | 'FAILURE';
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}): Promise<void> => {
  try {
    const userObjectId = params.userId
      ? typeof params.userId === 'string'
        ? new Types.ObjectId(params.userId)
        : params.userId
      : undefined;

    await AuditLog.create({
      userId: userObjectId,
      event: params.event,
      status: params.status,
      description: params.description,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });
  } catch (error) {
    logger.error('Failed to create audit log entry:', error);
  }
};
