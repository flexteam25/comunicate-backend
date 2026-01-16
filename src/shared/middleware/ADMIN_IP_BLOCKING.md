# IP Blocking System Documentation

## Overview

The IP blocking system has 2 types:
1. **Global IP Blocking**: Block IP for all users (except admin routes)
2. **User-Specific IP Blocking**: Block IP for a specific user

## Architecture

### 1. IP Tracking Flow

```
User call API
  → IpTrackingMiddleware (check global blocking for non-admin routes)
  → JWT Auth Guard
  → IpTrackingInterceptor (check user-specific blocking + track IP)
  → Controller
```

### 2. IP Storage Flow

```
User call API
  → Track IP to Redis: user:ips:{userId} (SET, TTL 1h)
  → Scheduler (every 5 minutes) sync from Redis → DB (user_ips table)
  → Or Admin trigger sync for specific user: POST /admin/users/:id/ips/sync
```

## Components

### 1. IpTrackingMiddleware

**Location**: `src/shared/middleware/ip-tracking.middleware.ts`

**Responsibilities**:
- Check **global IP blocking** for non-admin routes (`/api/*`, `/site-managers/*`, etc.)
- Skip check for admin routes (`/admin/*`)
- Lightweight - only checks Redis cache (`blocked:ips:global`)

**Logic**:
```typescript
if (path.startsWith('/admin/')) {
  // Skip global blocking for admin routes
  return next();
}

const isBlocked = await redisService.isIpGloballyBlocked(ip);
if (isBlocked) {
  throw 403 Forbidden;
}
```

### 2. IpTrackingInterceptor

**Location**: `src/shared/interceptors/ip-tracking.interceptor.ts`

**Responsibilities**:
- Check **user-specific IP blocking** after JWT auth (req.user available)
- Track user IP to Redis (async, non-blocking)
- Lightweight - only checks Redis cache (`blocked:ips:user:{userId}`)

**Logic**:
```typescript
if (userId && ip) {
  // Check user-specific blocking
  const userBlockedIps = await redisService.getBlockedIpsByUserId(userId);
  if (userBlockedIps?.includes(ip)) {
    throw 403 Forbidden;
  }
  
  // Track IP (non-blocking)
  await redisService.addUserIp(userId, ip);
}
```

### 3. UserIpSyncService (Scheduler)

**Location**: `src/commands/scheduler/user-ip-sync.service.ts`

**Responsibilities**:
- Sync IPs from Redis → DB (every 5 minutes)
- Only sync IPs, **DO NOT sync blocked IPs cache** (admin block/unblock already updates cache immediately)

**Cron**: `@Cron(CronExpression.EVERY_5_MINUTES)`

**Logic**:
```typescript
1. Get all keys: user:ips:*
2. Collect IPs for all users
3. Batch upsert to DB (user_ips table)
4. Keys expire after TTL (1h)
```

### 4. Admin IP Block/Unblock APIs

**Location**: `src/modules/user/interface/rest/admin/user.controller.ts`

#### Block User IP
- **Endpoint**: `POST /admin/users/:id/ips/block`
- **Logic**:
  1. Update DB: `user_ips.isBlocked = true`
  2. Update cache immediately: `blocked:ips:user:{userId}` (setImmediate - background)

#### Unblock User IP
- **Endpoint**: `POST /admin/users/:id/ips/unblock`
- **Logic**:
  1. Update DB: `user_ips.isBlocked = false`
  2. Update cache immediately: `blocked:ips:user:{userId}` (setImmediate - background)

#### Block Global IP
- **Endpoint**: `POST /admin/users/ips/block`
- **Logic**:
  1. Insert/Update DB: `blocked_ips` table
  2. Update cache immediately: `blocked:ips:global` (setImmediate - background)

#### Unblock Global IP
- **Endpoint**: `POST /admin/users/ips/unblock`
- **Logic**:
  1. Delete from DB: `blocked_ips` table
  2. Update cache immediately: `blocked:ips:global` (setImmediate - background)

### 5. Trigger IP Sync API

**Location**: `src/modules/user/interface/rest/admin/user.controller.ts`

- **Endpoint**: `POST /admin/users/:id/ips/sync`
- **Use Case**: `TriggerIpSyncUseCase`
- **Logic**:
  1. Get user IPs from Redis: `user:ips:{userId}`
  2. Upsert to DB (user_ips table)
  3. Update blocked IPs cache for that user: `blocked:ips:user:{userId}`
  4. Return result: `{ userId, totalIps, blockedIps }`

## Database Schema

### user_ips
```sql
CREATE TABLE user_ips (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  ip VARCHAR(45) NOT NULL,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, ip)
);
```

### blocked_ips (Global)
```sql
CREATE TABLE blocked_ips (
  id UUID PRIMARY KEY,
  ip VARCHAR(45) UNIQUE NOT NULL,
  note TEXT,
  created_by_admin_id UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Redis Cache Structure

### User IPs Tracking
- **Key**: `user:ips:{userId}`
- **Type**: Redis Set
- **TTL**: 3600 seconds (1 hour)
- **Purpose**: Track IPs user has used (temporary, before syncing to DB)

### Global Blocked IPs
- **Key**: `blocked:ips:global`
- **Type**: Redis Set
- **TTL**: 1800 seconds (30 minutes)
- **Purpose**: Cache globally blocked IPs
- **Update**: When admin block/unblock global IP

### User-Specific Blocked IPs
- **Key**: `blocked:ips:user:{userId}`
- **Type**: Redis Set
- **TTL**: 1800 seconds (30 minutes)
- **Purpose**: Cache blocked IPs for specific user
- **Update**: When admin block/unblock user IP or trigger sync

## Flow Diagram

### User Request Flow
```
Request → Middleware (check global block)
  → Auth Guard
  → Interceptor (check user block + track IP)
  → Controller
```

### IP Tracking Flow
```
User call API
  → Track to Redis: user:ips:{userId}
  → Scheduler (5 min) or Admin trigger sync
  → Sync to DB: user_ips table
```

### Block/Unblock Flow
```
Admin block/unblock
  → Update DB
  → Update cache immediately (setImmediate - background)
  → Return response
```

## Important Notes

1. **Blocked IPs cache does NOT need cron sync**:
   - Blocked IPs only change when admin block/unblock
   - Admin block/unblock already updates cache immediately
   - Cron `updateBlockedIpsCache()` has been removed

2. **Scheduler only syncs IPs**:
   - Sync from Redis → DB (user_ips table)
   - Does NOT sync blocked IPs cache

3. **Cache update strategy**:
   - Admin block/unblock → update cache immediately (setImmediate - background)
   - Trigger sync → update cache for that user
   - No cron sync for blocked IPs

4. **Global blocking skips admin routes**:
   - Admin routes (`/admin/*`) are not affected by global blocking
   - Admin IP blocking will be implemented separately in the future (see Future section)

## Future: Admin IP Blocking

### Recommended Implementation

To implement admin IP blocking in the future, create a separate guard/interceptor:

#### Option 1: Admin IP Blocking Guard (Recommended)
```typescript
// src/modules/admin/infrastructure/guards/admin-ip-blocking.guard.ts
@Injectable()
export class AdminIpBlockingGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const admin = request.admin; // Set by AdminJwtAuthGuard
    const ip = getClientIp(request);

    if (!admin || !ip || ip === 'unknown') {
      return true; // Skip if no admin or invalid IP
    }

    // Check admin-specific blocked IPs
    const adminBlockedIps = await this.redisService.getBlockedIpsByAdminId(admin.adminId);
    if (adminBlockedIps?.includes(ip)) {
      throw new HttpException(
        { statusCode: HttpStatus.FORBIDDEN, message: 'Access denied' },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
```

#### Database Schema (Future)
```sql
CREATE TABLE admin_blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  ip VARCHAR(45) NOT NULL,
  note TEXT,
  created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id, ip)
);

CREATE INDEX idx_admin_blocked_ips_admin_id ON admin_blocked_ips(admin_id);
CREATE INDEX idx_admin_blocked_ips_ip ON admin_blocked_ips(ip);
```

#### Redis Cache Structure (Future)
- **Key**: `blocked:ips:admin:{adminId}`
- **Type**: Redis Set
- **TTL**: 30 minutes (1800 seconds)
- **Update**: When admin block/unblock admin IP

#### Integration
```typescript
@UseGuards(AdminJwtAuthGuard, AdminIpBlockingGuard, AdminPermissionGuard)
```
