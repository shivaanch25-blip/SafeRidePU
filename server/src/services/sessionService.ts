import { DeviceSession } from '../models/DeviceSession.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { Types } from 'mongoose';
import { sendNewDeviceLoginEmail } from './emailService.js';
import { logger } from '../config/logger.js';
import { isDbConnected } from '../config/db.js';

export const registerDeviceSession = async (params: {
  userId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  email: string;
}): Promise<void> => {
  if (!isDbConnected()) {
    return;
  }

  try {
    const { userId, deviceId, deviceName, ipAddress, userAgent, email } = params;
    const userIdObj = new Types.ObjectId(userId);

    const existingSession = await DeviceSession.findOne({ userId: userIdObj, deviceId });

    if (existingSession) {
      existingSession.ipAddress = ipAddress;
      existingSession.userAgent = userAgent;
      existingSession.lastActive = new Date();
      await existingSession.save();
    } else {
      // New device session setup: save and trigger email alert
      await DeviceSession.create({
        userId: userIdObj,
        deviceId,
        deviceName,
        ipAddress,
        userAgent,
        lastActive: new Date(),
      });

      const timeStr = new Date().toLocaleString();
      sendNewDeviceLoginEmail(email, { name: deviceName, ip: ipAddress, time: timeStr }).catch((err) => {
        logger.error('Failed to send new device alert email:', err);
      });
    }

    // Write a record in LoginHistory
    await LoginHistory.create({
      userId: userIdObj,
      ipAddress,
      userAgent,
      browser: deviceName,
      os: 'Unknown',
      device: deviceName,
      loginTime: new Date(),
    });
  } catch (err) {
    logger.warn('Failed to record device session:', err);
  }
};

export const getActiveSessions = async (userId: string) => {
  if (!isDbConnected()) {
    return [];
  }
  try {
    return await DeviceSession.find({ userId: new Types.ObjectId(userId) }).sort({ lastActive: -1 });
  } catch {
    return [];
  }
};

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  if (!isDbConnected()) {
    return;
  }
  try {
    await DeviceSession.deleteOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });
  } catch {
    // Ignore
  }
};

export const revokeAllSessionsExceptCurrent = async (
  userId: string,
  currentDeviceId: string
): Promise<void> => {
  if (!isDbConnected()) {
    return;
  }
  try {
    await DeviceSession.deleteMany({
      userId: new Types.ObjectId(userId),
      deviceId: { $ne: currentDeviceId },
    });
  } catch {
    // Ignore
  }
};

export const revokeAllSessions = async (userId: string): Promise<void> => {
  if (!isDbConnected()) {
    return;
  }
  try {
    await DeviceSession.deleteMany({ userId: new Types.ObjectId(userId) });
  } catch {
    // Ignore
  }
};
