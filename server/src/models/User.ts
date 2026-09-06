import { Schema, model, Document } from 'mongoose';
import { UserRole, ROLES } from '@saferide/shared';

export interface IUser extends Document {
  email: string;
  password?: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isVerified: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  status: 'Active' | 'Inactive' | 'Suspended';
  passwordHistory: string[];
  profileCompleted: boolean;
  forgotPasswordToken?: string;
  forgotPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended'],
      default: 'Inactive',
    },
    passwordHistory: {
      type: [String],
      default: [],
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    forgotPasswordToken: {
      type: String,
    },
    forgotPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);
export default User;
