# Socket.IO Client Integration Guide

## Installation

```bash
npm install socket.io-client
```

## Quick Start

```javascript
import { io } from 'socket.io-client';

// 1. Connect
const socket = io('http://your-api-domain.com');

// 2. Listen for connection
socket.on('connected', () => {
  // 3. Authenticate with JWT token
  socket.emit('auth', { token: 'your-jwt-access-token' });
});

// 4. Listen for authentication
socket.on('auth:success', (data) => {
  console.log('Authenticated:', data);
});

socket.on('auth:error', (error) => {
  console.error('Auth failed:', error);
});

// 5. Listen for events
socket.on('site:created', (data) => {
  // Public event: new site created
  console.log('New site:', data);
});

socket.on('point:updated', (data) => {
  // Private event: only sent to the specific user whose points were changed
  console.log('Your points updated:', data);
});
```

## Events

### Connection
- `connected` - Connection established
- `error` - Connection error
- `disconnect` - Disconnected

### Authentication
- `auth` - Send auth request (client → server)
- `auth:success` - Auth successful (server → client)
- `auth:error` - Auth failed (server → client)

### Public Events
- `site:created` - New site created (broadcast to all)

### Private Events (requires authentication)
- `point:updated` - User points updated (sent **only** to the specific user)

## Notes

- Authenticate after connection to receive private events
- `point:updated` is sent only to the user whose points were changed
- Re-authenticate when JWT token is refreshed
