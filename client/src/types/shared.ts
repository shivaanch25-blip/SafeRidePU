export const ROLES = {
  RIDER: 'Rider',
  DRIVER: 'Driver',
  ADMIN: 'Admin',
  SECURITY_OFFICE: 'Security Office',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

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
