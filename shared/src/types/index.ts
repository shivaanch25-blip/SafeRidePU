import { UserRole, RideStatus, PaymentStatus } from '../constants/index.js';

export interface IUserShared {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isVerified: boolean;
  avatarUrl?: string;
}

export interface IRideShared {
  id: string;
  riderId: string;
  driverId?: string;
  pickupLocation: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  dropoffLocation: {
    address: string;
    coordinates: [number, number];
  };
  status: RideStatus;
  fareEstimate: number;
  pin: string;
  etaMinutes?: number;
}

export interface IPaymentShared {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface ISocketPayloads {
  LocationUpdate: {
    rideId: string;
    userId: string;
    coordinates: [number, number];
    heading?: number;
    speed?: number;
  };
  SOSAlert: {
    rideId?: string;
    userId: string;
    coordinates: [number, number];
    timestamp: Date;
    message?: string;
  };
}
