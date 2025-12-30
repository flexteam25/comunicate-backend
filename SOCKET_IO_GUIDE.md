# Socket.IO Events Summary

## Quick Start

```javascript
import { io } from 'socket.io-client';

const socket = io('http://your-api-domain.com');

socket.on('connected', () => {
  socket.emit('auth', { token: 'your-jwt-access-token' });
});

socket.on('auth:success', (data) => {
  console.log('Authenticated');
});
```

## Events

### Connection
- `connected` - Connection established
- `disconnect` - Disconnected
- `error` - Connection error

### Authentication
- `auth` - Send auth (client → server)
- `auth:success` - Auth successful
- `auth:error` - Auth failed

### Public Events
- `site:created` - New site created

### Private Events (requires auth)
- `point:updated` - User points updated
- `role:updated` - User role updated
- `inquiry:replied` - Inquiry replied by admin
