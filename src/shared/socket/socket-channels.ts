/**
 * Redis Pub/Sub Channels
 */
export enum RedisChannel {
  SITE_CREATED = 'site:created',
  POINT_UPDATED = 'point:updated',
  ROLE_UPDATED = 'role:updated',
  INQUIRY_CREATED = 'inquiry:created',
  INQUIRY_REPLIED = 'inquiry:replied',
  SCAM_REPORT_CREATED = 'scam-report:created',
  SCAM_REPORT_UPDATED = 'scam-report:updated',
  SCAM_REPORT_APPROVED = 'scam-report:approved',
  SCAM_REPORT_REJECTED = 'scam-report:rejected',
  EXCHANGE_APPROVED = 'exchange:approved',
  EXCHANGE_REJECTED = 'exchange:rejected',
  EXCHANGE_REQUESTED = 'exchange:requested',
  EXCHANGE_CANCELLED = 'exchange:cancelled',
  EXCHANGE_PROCESSING = 'exchange:processing',
  REDEMPTION_APPROVED = 'redemption:approved',
  REDEMPTION_REJECTED = 'redemption:rejected',
  REDEMPTION_CREATED = 'redemption:created',
  REDEMPTION_CANCELLED = 'redemption:cancelled',
}

/**
 * Socket.IO Event Names
 */
export enum SocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECTED = 'connected',
  ERROR = 'error',
  // Authentication
  AUTH = 'auth',
  AUTH_SUCCESS = 'auth:success',
  AUTH_ERROR = 'auth:error',
  ADMIN_AUTH = 'admin:auth',
  ADMIN_AUTH_SUCCESS = 'admin:auth:success',
  ADMIN_AUTH_ERROR = 'admin:auth:error',
  // Channel management
  JOIN_CHANNEL = 'join-channel',
  LEAVE_CHANNEL = 'leave-channel',
  JOINED_CHANNEL = 'joined-channel',
  LEFT_CHANNEL = 'left-channel',
  // Public events
  SITE_CREATED = 'site:created',
  // Private events (per user)
  POINT_UPDATED = 'point:updated',
  ROLE_UPDATED = 'role:updated',
  // Admin events
  INQUIRY_CREATED = 'inquiry:created',
  INQUIRY_REPLIED = 'inquiry:replied',
  SCAM_REPORT_CREATED = 'scam-report:created',
  SCAM_REPORT_UPDATED = 'scam-report:updated',
  SCAM_REPORT_APPROVED = 'scam-report:approved',
  SCAM_REPORT_REJECTED = 'scam-report:rejected',
  EXCHANGE_APPROVED = 'exchange:approved',
  EXCHANGE_REJECTED = 'exchange:rejected',
  EXCHANGE_REQUESTED = 'exchange:requested',
  EXCHANGE_CANCELLED = 'exchange:cancelled',
  EXCHANGE_PROCESSING = 'exchange:processing',
  REDEMPTION_APPROVED = 'redemption:approved',
  REDEMPTION_REJECTED = 'redemption:rejected',
  REDEMPTION_CREATED = 'redemption:created',
  REDEMPTION_CANCELLED = 'redemption:cancelled',
}

/**
 * Socket Rooms
 */
export enum SocketRoom {
  PUBLIC = 'public',
  USER = 'user', // Prefix: user.{userId}
  ADMIN = 'admin',
}
