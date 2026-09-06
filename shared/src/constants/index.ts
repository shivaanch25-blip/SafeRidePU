export const ROLES = {
  RIDER: 'Rider',
  DRIVER: 'Driver',
  ADMIN: 'Admin',
  SECURITY_OFFICE: 'Security Office',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const RIDE_STATUS = {
  REQUESTED: 'REQUESTED',
  ASSIGNED: 'ASSIGNED',
  EN_ROUTE_TO_PICKUP: 'EN_ROUTE_TO_PICKUP',
  ARRIVED_PICKUP: 'ARRIVED_PICKUP',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type RideStatus = typeof RIDE_STATUS[keyof typeof RIDE_STATUS];

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  RIDE_REQUEST: 'ride_request',
  RIDE_ACCEPT: 'ride_accept',
  RIDE_REJECT: 'ride_reject',
  RIDE_UPDATE: 'ride_update',
  LOCATION_UPDATE: 'location_update',
  SOS_ALERT: 'sos_alert',
  SOS_RESOLVE: 'sos_resolve',
  CHAT_MESSAGE: 'chat_message',
  NOTIFICATION: 'notification',
} as const;
