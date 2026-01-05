# Socket.IO Events Guide

## Quick Start

```javascript
import { io } from 'socket.io-client';

// Connect to server
const socket = io('http://your-api-domain.com');

// User authentication
socket.on('connected', () => {
  socket.emit('auth', { token: 'your-user-jwt-token' });
});

socket.on('auth:success', (data) => {
  console.log('User authenticated', data);
});

// Admin authentication
socket.on('connected', () => {
  socket.emit('admin:auth', { token: 'your-admin-jwt-token' });
});

socket.on('admin:auth:success', (data) => {
  console.log('Admin authenticated', data);
});
```

## Events

### Connection Events
All clients receive these events automatically.

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Server → Client | Connection established |
| `connected` | Server → Client | Connection confirmed message |
| `disconnect` | Server → Client | Disconnected from server |
| `error` | Server → Client | Connection error |

### Authentication Events

| Event | Direction | Target | Description |
|-------|-----------|--------|-------------|
| `auth` | Client → Server | - | User authentication request |
| `auth:success` | Server → Client | User room | User authentication successful |
| `auth:error` | Server → Client | - | User authentication failed |
| `admin:auth` | Client → Server | - | Admin authentication request |
| `admin:auth:success` | Server → Client | Admin room | Admin authentication successful |
| `admin:auth:error` | Server → Client | - | Admin authentication failed |

### Public Events
Sent to **PUBLIC room** - All connected clients receive these events.

| Event | Target | Description |
|-------|--------|-------------|
| `site:created` | PUBLIC room | New site created by admin |

### Private Events (User)
Sent to **user.{userId} room** - Only the specific user receives these events. Requires user authentication.

| Event | Target | Description |
|-------|--------|-------------|
| `point:updated` | `user.{userId}` room | User points updated (admin adjust, exchange, redemption, etc.) |
| `role:updated` | `user.{userId}` room | User role changed (user ↔ partner) |

### Admin Events
Sent to **ADMIN room** - All connected admins receive these events. Requires admin authentication.

| Event | Target | Description |
|-------|--------|-------------|
| `inquiry:created` | ADMIN room | New inquiry created by user |
| `scam-report:created` | ADMIN room | New scam report created by user |
| `exchange:requested` | ADMIN room | Point exchange requested by user |
| `exchange:cancelled` | ADMIN room | Point exchange cancelled by user |
| `redemption:created` | ADMIN room | Gifticon redemption created by user |
| `redemption:cancelled` | ADMIN room | Gifticon redemption cancelled by user |

### Mixed Events
Sent to multiple rooms simultaneously.

| Event | Target | Description |
|-------|--------|-------------|
| `inquiry:replied` | `user.{userId}` room + ADMIN room | Inquiry replied by admin (sent to inquiry owner user and all admins) |
| `scam-report:updated` | `user.{userId}` room (if has userId) + ADMIN room | Scam report updated by user (sent to report owner user if exists and all admins) |
| `scam-report:approved` | `user.{userId}` room (if has userId) + ADMIN room | Scam report approved by admin (sent to report owner user if exists and all admins) |
| `scam-report:rejected` | `user.{userId}` room (if has userId) + ADMIN room | Scam report rejected by admin (sent to report owner user if exists and all admins) |
| `exchange:processing` | `user.{userId}` room + ADMIN room | Point exchange moved to processing by admin (sent to exchange owner user and all admins) |
| `exchange:approved` | `user.{userId}` room + ADMIN room | Point exchange approved by admin (sent to exchange owner user and all admins) |
| `exchange:rejected` | `user.{userId}` room + ADMIN room | Point exchange rejected by admin (sent to exchange owner user and all admins) |
| `redemption:approved` | `user.{userId}` room + ADMIN room | Gifticon redemption approved by admin (sent to redemption owner user and all admins) |
| `redemption:rejected` | `user.{userId}` room + ADMIN room | Gifticon redemption rejected by admin (sent to redemption owner user and all admins) |

## Notes

- **PUBLIC room**: All connected clients automatically join this room
- **User room** (`user.{userId}`): Client joins after successful user authentication via `auth` event
- **Admin room** (`admin`): Client joins after successful admin authentication via `admin:auth` event
- A client can be authenticated as both user and admin simultaneously
- Events are sent via Redis Pub/Sub, ensuring all server instances receive them
