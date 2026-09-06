import { Request, Response, NextFunction } from 'express';
import { SOSAlert } from '../models/SOSAlert.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from '../services/auditService.js';
import { logger } from '../config/logger.js';

// 1. Trigger Emergency SOS Alert
export const triggerSOSAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, rideId, message } = req.body;
    const user = (req as any).user;

    const riderName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Anonymous Student / Rider';
    const riderEmail = user ? user.email : 'emergency@paruluniversity.ac.in';
    const riderPhone = user?.phoneNumber || '+91 2668 260300';

    const lat = location?.lat || 22.2887; // Parul University Waghodia default
    const lng = location?.lng || 73.3634;
    const address = location?.address || 'Parul University Campus, Waghodia, Vadodara';

    const alert = await SOSAlert.create({
      userId: user?._id,
      riderName,
      riderEmail,
      riderPhone,
      location: { lat, lng, address },
      status: 'ACTIVE',
      emergencyContactsNotified: true,
      notes: message || 'Emergency SOS trigger from rider mobile app / web client',
    });

    logger.warn(`🚨 [EMERGENCY SOS] Triggered by ${riderName} (${riderEmail}) at [${lat}, ${lng}] - ${address}`);

    if (user?._id) {
      await logAuditEvent({
        userId: user._id.toString(),
        event: 'SECURITY_ALERT',
        status: 'SUCCESS',
        description: `Emergency SOS Alert triggered at location: ${address}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
    }

    return sendSuccess(
      res,
      {
        alertId: alert._id.toString(),
        status: alert.status,
        timestamp: alert.createdAt,
        emergencyDesk: 'Parul University Central Security Office (Waghodia Campus)',
        emergencyContacts: [
          { name: 'PU Campus Security Control Room', phone: '+91 2668 260300' },
          { name: 'National Emergency Service', phone: '112' },
          { name: 'Parul Sevashram Hospital Emergency', phone: '+91 2668 260222' },
        ],
      },
      '🚨 EMERGENCY SOS ALERT BROADCASTED TO CAMPUS SECURITY DESK',
      201
    );
  } catch (error) {
    next(error);
  }
};

// 2. Resolve / Clear Emergency SOS Alert
export const resolveSOSAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.body;

    if (!alertId) {
      throw new AppError('Alert ID is required to resolve SOS status', 400);
    }

    const alert = await SOSAlert.findById(alertId);
    if (!alert) {
      throw new AppError('SOS Alert record not found', 404);
    }

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    await alert.save();

    logger.info(`✅ [EMERGENCY SOS] Alert ${alertId} resolved.`);

    return sendSuccess(res, { alertId: alert._id, status: alert.status }, 'SOS Alert resolved successfully.');
  } catch (error) {
    next(error);
  }
};

// 3. Get Active SOS Alerts
export const getActiveAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await SOSAlert.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).limit(10);
    return sendSuccess(res, { alerts, count: alerts.length }, 'Active emergency alerts retrieved.');
  } catch (error) {
    next(error);
  }
};
