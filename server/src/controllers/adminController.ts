import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import Ride from '../models/Ride.js';
import SOSAlert from '../models/SOSAlert.js';
import { AppError } from '../utils/appError.js';
import { sendSuccess } from '../utils/response.js';
import { isDbConnected } from '../config/db.js';
import { inMemoryUsers } from './authController.js';
import { inMemoryRides } from './rideController.js';

// In-memory mock SOS alerts for offline/demo mode
export interface IMockSOS {
  _id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  status: 'ACTIVE' | 'RESOLVED';
  coordinates: [number, number];
  locationDescription: string;
  message?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export const inMemorySosAlerts: IMockSOS[] = [
  {
    _id: 'sos_demo_01',
    userId: 'usr_seed_shivani',
    userName: 'Shivani Kumari',
    userPhone: '+91 8299047221',
    userEmail: '2303051050876@paruluniversity.ac.in',
    status: 'ACTIVE',
    coordinates: [73.3644, 22.2887],
    locationDescription: 'Hostel Block B - Outer Ring Road',
    message: 'Medical / Security assistance requested near campus gate',
    createdAt: new Date(Date.now() - 15 * 60000),
  },
];

// 1. Get Platform Stats & KPIs
export const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      const totalUsers = inMemoryUsers.length;
      const activeDrivers = inMemoryUsers.filter((u) => u.role === 'Driver').length;
      const totalRides = inMemoryRides.length;
      const totalRevenue = inMemoryRides.reduce((sum, r) => sum + (r.fare || 0), 0);
      const activeSosCount = inMemorySosAlerts.filter((s) => s.status === 'ACTIVE').length;

      return sendSuccess(
        res,
        {
          stats: {
            totalUsers,
            activeDrivers,
            totalRides,
            totalRevenue,
            activeSosCount,
            dbConnected: false,
            serverUptime: Math.floor(process.uptime()),
          },
        },
        'Admin statistics retrieved (Demo Fallback).'
      );
    }

    const [totalUsers, activeDrivers, totalRides, completedRides, activeSosCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'Driver', status: 'Active' }),
      Ride.countDocuments(),
      Ride.find({ status: 'COMPLETED' }),
      SOSAlert.countDocuments({ status: 'ACTIVE' }),
    ]);

    const totalRevenue = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);

    return sendSuccess(
      res,
      {
        stats: {
          totalUsers,
          activeDrivers,
          totalRides,
          totalRevenue,
          activeSosCount,
          dbConnected: true,
          serverUptime: Math.floor(process.uptime()),
        },
      },
      'Admin statistics retrieved.'
    );
  } catch (error) {
    next(error);
  }
};

// 2. Get All Users (with Search & Role Filter)
export const getAdminUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, role, status } = req.query;

    if (!isDbConnected()) {
      let filtered = [...inMemoryUsers];
      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            u.firstName.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q)
        );
      }
      if (role && role !== 'ALL') {
        filtered = filtered.filter((u) => u.role === role);
      }
      if (status && status !== 'ALL') {
        filtered = filtered.filter((u) => u.status === status);
      }

      return sendSuccess(res, { users: filtered }, 'Users list retrieved.');
    }

    const query: any = {};
    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }
    if (role && role !== 'ALL') {
      query.role = role;
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const users = await User.find(query).sort({ createdAt: -1 }).select('-password');
    return sendSuccess(res, { users }, 'Users list retrieved.');
  } catch (error) {
    next(error);
  }
};

// 3. Update User Status (Activate, Suspend, Verify)
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;

    if (!isDbConnected()) {
      const user = inMemoryUsers.find((u) => u._id === id);
      if (!user) {
        throw new AppError('User not found.', 404);
      }
      if (status) user.status = status;
      if (role) user.role = role;
      return sendSuccess(res, { user }, 'User updated successfully.');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    if (status) user.status = status;
    if (role) user.role = role;
    await user.save();

    return sendSuccess(res, { user }, 'User updated successfully.');
  } catch (error) {
    next(error);
  }
};

// 4. Get All Campus Rides
export const getAdminRides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      return sendSuccess(res, { rides: inMemoryRides }, 'Campus rides retrieved.');
    }

    const rides = await Ride.find().sort({ createdAt: -1 }).limit(100);
    return sendSuccess(res, { rides }, 'Campus rides retrieved.');
  } catch (error) {
    next(error);
  }
};

// 5. Get Campus SOS Alerts
export const getAdminSosAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      return sendSuccess(res, { alerts: inMemorySosAlerts }, 'Campus SOS emergency alerts retrieved.');
    }

    const alerts = await SOSAlert.find().sort({ createdAt: -1 }).limit(50);
    return sendSuccess(res, { alerts }, 'Campus SOS emergency alerts retrieved.');
  } catch (error) {
    next(error);
  }
};

// 6. Resolve SOS Alert
export const resolveSosAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      const alert = inMemorySosAlerts.find((a) => a._id === id);
      if (alert) {
        alert.status = 'RESOLVED';
        alert.resolvedAt = new Date();
      }
      return sendSuccess(res, { alert }, 'SOS alert resolved successfully.');
    }

    const alert = await SOSAlert.findById(id);
    if (!alert) {
      throw new AppError('SOS alert not found.', 404);
    }

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    await alert.save();

    return sendSuccess(res, { alert }, 'SOS alert resolved successfully.');
  } catch (error) {
    next(error);
  }
};
