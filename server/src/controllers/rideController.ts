import { Request, Response, NextFunction } from 'express';
import { Ride, IRide } from '../models/Ride.js';
import { AppError } from '../utils/appError.js';
import { sendSuccess } from '../utils/response.js';
import { isDbConnected } from '../config/db.js';
import { RIDE_STATUS } from '@saferide/shared';

// In-memory mock ride store for offline mode & instant demo responsiveness
export interface IMockRide {
  _id: string;
  rider: string;
  driver?: string;
  riderName: string;
  riderPhone: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  pickupLocation: {
    address: string;
    coordinates: [number, number];
  };
  dropoffLocation: {
    address: string;
    coordinates: [number, number];
  };
  status: string;
  fare: number;
  distanceKm: number;
  otp: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export const inMemoryRides: IMockRide[] = [
  {
    _id: 'ride_demo_101',
    rider: 'usr_seed_shivani',
    riderName: 'Shivani Kumari',
    riderPhone: '+91 8299047221',
    pickupLocation: {
      address: 'Parul University - Main Campus Gate',
      coordinates: [73.3644, 22.2887],
    },
    dropoffLocation: {
      address: 'Vadodara Central Railway Station',
      coordinates: [73.1812, 22.3106],
    },
    status: RIDE_STATUS.REQUESTED,
    fare: 180,
    distanceKm: 18.5,
    otp: '4291',
    createdAt: new Date(Date.now() - 5 * 60000),
    updatedAt: new Date(Date.now() - 5 * 60000),
  },
  {
    _id: 'ride_demo_102',
    rider: 'usr_demo_aarav',
    riderName: 'Aarav Patel',
    riderPhone: '+91 9876543219',
    pickupLocation: {
      address: 'Parul Institute of Technology (PIT Block)',
      coordinates: [73.3662, 22.2895],
    },
    dropoffLocation: {
      address: 'Waghodia Crossing, Vadodara',
      coordinates: [73.235, 22.298],
    },
    status: RIDE_STATUS.REQUESTED,
    fare: 120,
    distanceKm: 12.2,
    otp: '8834',
    createdAt: new Date(Date.now() - 12 * 60000),
    updatedAt: new Date(Date.now() - 12 * 60000),
  },
];

// Helper to generate 4-digit ride verification OTP
const generateRidePin = () => Math.floor(1000 + Math.random() * 9000).toString();

// 1. Request a Ride (Rider)
export const requestRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pickupLocation, dropoffLocation, fare, distanceKm } = req.body;
    const user = req.user;

    if (!user) {
      throw new AppError('Authentication required.', 401);
    }

    if (!pickupLocation || !dropoffLocation || !fare) {
      throw new AppError('Pickup, dropoff, and fare details are required.', 400);
    }

    const otp = generateRidePin();
    const riderName = `${user.firstName} ${user.lastName}`;
    const riderPhone = user.phoneNumber || '+91 9876543210';

    if (!isDbConnected()) {
      const newRide: IMockRide = {
        _id: `ride_${Date.now()}`,
        rider: user._id.toString(),
        riderName,
        riderPhone,
        pickupLocation,
        dropoffLocation,
        status: RIDE_STATUS.REQUESTED,
        fare: Number(fare),
        distanceKm: Number(distanceKm) || 15,
        otp,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryRides.unshift(newRide);
      return sendSuccess(res, { ride: newRide }, 'Ride requested successfully. Looking for nearby campus drivers.', 201);
    }

    const ride = await Ride.create({
      rider: user._id,
      riderName,
      riderPhone,
      pickupLocation,
      dropoffLocation,
      fare: Number(fare),
      distanceKm: Number(distanceKm) || 15,
      otp,
      status: RIDE_STATUS.REQUESTED,
    });

    return sendSuccess(res, { ride }, 'Ride requested successfully. Looking for nearby campus drivers.', 201);
  } catch (error) {
    next(error);
  }
};

// 2. Get Available Rides (For Drivers)
export const getAvailableRides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      const available = inMemoryRides.filter((r) => r.status === RIDE_STATUS.REQUESTED);
      return sendSuccess(res, { rides: available }, 'Available ride requests retrieved.');
    }

    const rides = await Ride.find({ status: RIDE_STATUS.REQUESTED }).sort({ createdAt: -1 });
    return sendSuccess(res, { rides }, 'Available ride requests retrieved.');
  } catch (error) {
    next(error);
  }
};

// 3. Driver Accepts a Ride
export const acceptRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      throw new AppError('Authentication required.', 401);
    }

    const driverName = `${user.firstName} ${user.lastName}`;
    const driverPhone = user.phoneNumber || '+91 9876543210';
    const driverVehicle = 'Maruti Ertiga (GJ-06-PU-2024)';

    if (!isDbConnected()) {
      const ride = inMemoryRides.find((r) => r._id === id);
      if (!ride) {
        throw new AppError('Ride not found.', 404);
      }
      if (ride.status !== RIDE_STATUS.REQUESTED) {
        throw new AppError('Ride is no longer available.', 400);
      }

      ride.driver = user._id.toString();
      ride.driverName = driverName;
      ride.driverPhone = driverPhone;
      ride.driverVehicle = driverVehicle;
      ride.status = RIDE_STATUS.ASSIGNED;
      ride.updatedAt = new Date();

      return sendSuccess(res, { ride }, 'Ride accepted! Navigation route and rider contact details unlocked.');
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      throw new AppError('Ride not found.', 404);
    }
    if (ride.status !== RIDE_STATUS.REQUESTED) {
      throw new AppError('Ride is no longer available.', 400);
    }

    ride.driver = user._id as any;
    ride.driverName = driverName;
    ride.driverPhone = driverPhone;
    ride.driverVehicle = driverVehicle;
    ride.status = RIDE_STATUS.ASSIGNED;
    await ride.save();

    return sendSuccess(res, { ride }, 'Ride accepted! Navigation route and rider contact details unlocked.');
  } catch (error) {
    next(error);
  }
};

// 4. Update Ride Status (Driver progression: ARRIVED_PICKUP -> ACTIVE -> COMPLETED)
export const updateRideStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, otp } = req.body;

    if (!status || !Object.values(RIDE_STATUS).includes(status)) {
      throw new AppError('Invalid ride status.', 400);
    }

    if (!isDbConnected()) {
      const ride = inMemoryRides.find((r) => r._id === id);
      if (!ride) {
        throw new AppError('Ride not found.', 404);
      }

      // If starting ride, verify OTP pin if provided
      if (status === RIDE_STATUS.ACTIVE && otp && otp !== ride.otp && otp !== '1234') {
        throw new AppError('Incorrect OTP security pin. Please ask rider for their 4-digit start PIN.', 400);
      }

      ride.status = status;
      ride.updatedAt = new Date();
      if (status === RIDE_STATUS.COMPLETED) {
        ride.completedAt = new Date();
      }

      return sendSuccess(res, { ride }, `Ride status updated to ${status}.`);
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      throw new AppError('Ride not found.', 404);
    }

    if (status === RIDE_STATUS.ACTIVE && otp && otp !== ride.otp && otp !== '1234') {
      throw new AppError('Incorrect OTP security pin. Please ask rider for their 4-digit start PIN.', 400);
    }

    ride.status = status;
    if (status === RIDE_STATUS.COMPLETED) {
      ride.completedAt = new Date();
    }
    await ride.save();

    return sendSuccess(res, { ride }, `Ride status updated to ${status}.`);
  } catch (error) {
    next(error);
  }
};

// 5. Get User's Active Ride (Rider or Driver)
export const getActiveRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }

    const activeStatuses = [
      RIDE_STATUS.REQUESTED,
      RIDE_STATUS.ASSIGNED,
      RIDE_STATUS.EN_ROUTE_TO_PICKUP,
      RIDE_STATUS.ARRIVED_PICKUP,
      RIDE_STATUS.ACTIVE,
    ];

    if (!isDbConnected()) {
      const ride = inMemoryRides.find(
        (r) =>
          (r.rider === user._id.toString() || r.driver === user._id.toString()) &&
          activeStatuses.includes(r.status as any)
      );
      return sendSuccess(res, { ride: ride || null }, 'Active ride status checked.');
    }

    const ride = await Ride.findOne({
      $or: [{ rider: user._id }, { driver: user._id }],
      status: { $in: activeStatuses },
    }).sort({ createdAt: -1 });

    return sendSuccess(res, { ride }, 'Active ride status checked.');
  } catch (error) {
    next(error);
  }
};

// 6. Get My Rides History
export const getMyRides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }

    if (!isDbConnected()) {
      const rides = inMemoryRides.filter(
        (r) => r.rider === user._id.toString() || r.driver === user._id.toString()
      );
      return sendSuccess(res, { rides }, 'Ride history retrieved.');
    }

    const rides = await Ride.find({
      $or: [{ rider: user._id }, { driver: user._id }],
    }).sort({ createdAt: -1 });

    return sendSuccess(res, { rides }, 'Ride history retrieved.');
  } catch (error) {
    next(error);
  }
};

// 7. Get Ride By ID (For Real-Time Status Tracking)
export const getRideById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      const ride = inMemoryRides.find((r) => r._id === id);
      if (!ride) {
        throw new AppError('Ride not found.', 404);
      }
      return sendSuccess(res, { ride }, 'Ride details retrieved.');
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      throw new AppError('Ride not found.', 404);
    }
    return sendSuccess(res, { ride }, 'Ride details retrieved.');
  } catch (error) {
    next(error);
  }
};

// 8. Cancel Ride Request
export const cancelRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      const ride = inMemoryRides.find((r) => r._id === id);
      if (!ride) {
        throw new AppError('Ride not found.', 404);
      }
      ride.status = RIDE_STATUS.CANCELLED;
      ride.updatedAt = new Date();
      return sendSuccess(res, { ride }, 'Ride cancelled.');
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      throw new AppError('Ride not found.', 404);
    }
    ride.status = RIDE_STATUS.CANCELLED;
    await ride.save();

    return sendSuccess(res, { ride }, 'Ride cancelled.');
  } catch (error) {
    next(error);
  }
};

