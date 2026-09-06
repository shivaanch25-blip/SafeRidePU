"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = exports.PAYMENT_STATUS = exports.RIDE_STATUS = exports.ROLES = void 0;
exports.ROLES = {
    RIDER: 'Rider',
    DRIVER: 'Driver',
    ADMIN: 'Admin',
    SECURITY_OFFICE: 'Security Office',
};
exports.RIDE_STATUS = {
    REQUESTED: 'REQUESTED',
    ASSIGNED: 'ASSIGNED',
    EN_ROUTE_TO_PICKUP: 'EN_ROUTE_TO_PICKUP',
    ARRIVED_PICKUP: 'ARRIVED_PICKUP',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};
exports.PAYMENT_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
};
exports.SOCKET_EVENTS = {
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
};
