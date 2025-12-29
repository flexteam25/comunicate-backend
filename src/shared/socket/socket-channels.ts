/**
 * Redis Pub/Sub Channels
 */
export enum RedisChannel {
  SITE_CREATED = 'site:created',
  POINT_UPDATED = 'point:updated',
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
  // Channel management
  JOIN_CHANNEL = 'join-channel',
  LEAVE_CHANNEL = 'leave-channel',
  JOINED_CHANNEL = 'joined-channel',
  LEFT_CHANNEL = 'left-channel',
  // Public events
  SITE_CREATED = 'site:created',
  // Private events (per user)
  POINT_UPDATED = 'point:updated',
}

/**
 * Socket Rooms
 */
export enum SocketRoom {
  PUBLIC = 'public',
  USER = 'user', // Prefix: user.{userId}
}
