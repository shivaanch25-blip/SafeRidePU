import { DeviceSession } from '../models/DeviceSession.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { Types } from 'mongoose';
import { sendNewDeviceLoginEmail } from './emailService.js';
import { logger } from '../config/logger.js';
import { isDbConnected } from '../config/db.js';

export interface IMockSession {
  _id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  lastActive: Date;
  isTrusted: boolean;
}

export const inMemorySessions: IMockSession[] = [
  {
    _id: 'sess_seed_1',
    userId: 'usr_seed_shivani',
    userEmail: '2303051050876@paruluniversity.ac.in',
    userName: 'Shivani Kumari',
    deviceId: 'dev_chrome_win_01',
    deviceName: 'Desktop Browser (Chrome / Windows 11)',
    ipAddress: '127.0.0.1 (Campus Wi-Fi)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
    lastActive: new Date(),
    isTrusted: true,
  },
  {
    _id: 'sess_seed_2',
    userId: 'usr_driver_rajesh',
    userEmail: 'driver@paruluniversity.ac.in',
    userName: 'Rajesh Sharma',
    deviceId: 'dev_android_app_02',
    deviceName: 'Mobile Device (Android 14)',
    ipAddress: '172.16.24.89 (Cellular 5G)',
    userAgent: 'SafeRide Driver Mobile App / Android',
    lastActive: new Date(Date.now() - 15 * 60000),
    isTrusted: true,
  },
];

export const registerDeviceSession = async (params: {
  userId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  email: string;
}): Promise<void> => {
  const { userId, deviceId, deviceName, ipAddress, userAgent, email } = params;

  if (!isDbConnected()) {
    const existing = inMemorySessions.find((s) => s.userId === userId && s.deviceId === deviceId);
    if (existing) {
      existing.ipAddress = ipAddress;
      existing.userAgent = userAgent;
      existing.lastActive = new Date();
    } else {
      inMemorySessions.unshift({
        _id: `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId,
        userEmail: email,
        userName: email.split('@')[0],
        deviceId,
        deviceName,
        ipAddress,
        userAgent,
        lastActive: new Date(),
        isTrusted: true,
      });
    }
    return;
  }

  try {
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
    return inMemorySessions.filter((s) => s.userId === userId || userId === 'usr_demo' || userId.includes('demo') || s.userId === 'usr_seed_shivani');
  }
  try {
    return await DeviceSession.find({ userId: new Types.ObjectId(userId) }).sort({ lastActive: -1 });
  } catch {
    return [];
  }
};

export const getAllActiveSessions = async () => {
  if (!isDbConnected()) {
    return [...inMemorySessions];
  }
  try {
    return await DeviceSession.find().populate('userId', 'firstName lastName email role').sort({ lastActive: -1 });
  } catch {
    return [...inMemorySessions];
  }
};

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  const index = inMemorySessions.findIndex((s) => s._id === sessionId && (s.userId === userId || userId === 'usr_demo' || userId === 'usr_seed_shivani'));
  if (index !== -1) {
    inMemorySessions.splice(index, 1);
  }

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

export const adminRevokeSession = async (sessionId: string): Promise<void> => {
  const index = inMemorySessions.findIndex((s) => s._id === sessionId);
  if (index !== -1) {
    inMemorySessions.splice(index, 1);
  }

  if (!isDbConnected()) {
    return;
  }
  try {
    await DeviceSession.deleteOne({ _id: new Types.ObjectId(sessionId) });
  } catch {
    // Ignore
  }
};

export const revokeAllSessionsExceptCurrent = async (
  userId: string,
  currentDeviceId: string
): Promise<void> => {
  for (let i = inMemorySessions.length - 1; i >= 0; i--) {
    if (inMemorySessions[i].userId === userId && inMemorySessions[i].deviceId !== currentDeviceId) {
      inMemorySessions.splice(i, 1);
    }
  }

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
  for (let i = inMemorySessions.length - 1; i >= 0; i--) {
    if (inMemorySessions[i].userId === userId || userId === 'usr_demo' || userId === 'usr_seed_shivani') {
      inMemorySessions.splice(i, 1);
    }
  }

  if (!isDbConnected()) {
    return;
  }
  try {
    await DeviceSession.deleteMany({ userId: new Types.ObjectId(userId) });
  } catch {
    // Ignore
  }
};
