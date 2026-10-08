import { Schema, model, Document, Types } from 'mongoose';
import { RIDE_STATUS, RideStatus } from '@saferide/shared';

export interface IRide extends Document {
  rider: Types.ObjectId;
  driver?: Types.ObjectId;
  riderName: string;
  riderPhone: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  pickupLocation: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  dropoffLocation: {
    address: string;
    coordinates: [number, number];
  };
  status: RideStatus;
  fare: number;
  distanceKm: number;
  otp: string;
  rating?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rideSchema = new Schema<IRide>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    riderName: {
      type: String,
      required: true,
    },
    riderPhone: {
      type: String,
      default: '',
    },
    driverName: {
      type: String,
    },
    driverPhone: {
      type: String,
    },
    driverVehicle: {
      type: String,
    },
    pickupLocation: {
      address: { type: String, required: true },
      coordinates: { type: [Number], required: true },
    },
    dropoffLocation: {
      address: { type: String, required: true },
      coordinates: { type: [Number], required: true },
    },
    status: {
      type: String,
      enum: Object.values(RIDE_STATUS),
      default: RIDE_STATUS.REQUESTED,
      index: true,
    },
    fare: {
      type: Number,
      required: true,
    },
    distanceKm: {
      type: Number,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Ride = model<IRide>('Ride', rideSchema);
export default Ride;
