# POCA.GG Backend - Work Log

## Project Overview
POCA.GG is a platform providing information, reviews, and scam reports for Toto/Casino sites.

---

## ✅ Completed

### 1. Project Structure (DDD Architecture)
```
src/
├── modules/                  # DDD modules
│   ├── auth/                 # Authentication module
│   ├── badge/                # Badge system
│   └── user/                 # User management
├── shared/                   # Cross-cutting concerns
│   ├── decorators/           # Custom decorators
│   ├── domain/               # Base entity classes
│   ├── dto/                  # Shared DTOs
│   ├── filters/              # Exception filters
│   ├── guards/               # Auth guards
│   ├── logger/               # Logging
│   ├── middleware/           # HTTP middleware
│   ├── queue/                # BullMQ queue (notification)
│   ├── redis/                # Redis client
│   ├── services/             # Shared services
│   ├── socket/               # Socket.IO
│   └── utils/                # Utility functions
├── migrations/               # TypeORM migrations
├── seeders/                  # Seed data
└── main.ts                   # Entry point
```

---

### 2. Database Schema (Migration)

**Tables created:**
| Table | Description |
|-------|-------------|
| `users` | User info (email, password_hash, display_name, avatar_url, is_active, last_login_at) |
| `roles` | Roles (user, site-owner, admin) |
| `permissions` | System permissions |
| `badges` | Badge system (user/site types) |
| `user_tokens` | JWT refresh tokens (stateful token management) |
| `user_roles` | User-Role mapping (many-to-many) |
| `user_permissions` | User-Permission mapping (many-to-many) |
| `user_badges` | User-Badge mapping (many-to-many) |

---

### 3. Authentication Module (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user + auto login | ❌ |
| `POST` | `/api/auth/login` | Login, returns JWT tokens | ❌ |
| `POST` | `/api/auth/refresh` | Refresh access token | ❌ |
| `GET` | `/api/auth/me` | Get current user info | ✅ |

**Features:**
- ✅ User registration with email/password
- ✅ Login with JWT (access + refresh tokens)
- ✅ Stateful token management (tokens can be revoked)
- ✅ Password hashing with bcrypt
- ✅ Auto login after registration

---

### 4. User Module (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `PUT` | `/api/users/profile` | Update displayName only | ✅ |
| `PUT` | `/api/users/change-password` | Change password | ✅ |
| `POST` | `/api/users/avatar` | Upload avatar image | ✅ |

**Features:**
- ✅ Update profile (displayName only)
- ✅ Change password (requires current password)
- ✅ Upload avatar with image processing (avatarUrl updated via this endpoint only)

---

### 5. Role & Permission System

**Roles (seeded):**
- `user` - Regular user
- `site-owner` - Site owner
- `admin` - Administrator

**Permissions (seeded):**
- `users.create`, `users.read`, `users.update`, `users.delete`
- `sites.create`, `sites.update`, `sites.delete`
- `reviews.moderate`, `scam-reports.moderate`
- `admin.access`

---

### 6. Badge System

**Badge Types:**
- `USER` - Badges for users
- `SITE` - Badges for sites

**Sample Badges (seeded):**
- Early Adopter, Verified User, Top Reviewer (USER type)
- Trusted Site, Premium Site (SITE type)

---

### 7. Shared Infrastructure

| Component | Description |
|-----------|-------------|
| `JwtService` | Generate/verify JWT tokens |
| `PasswordService` | Hash/verify passwords (bcrypt) |
| `JwtAuthGuard` | Protect routes, validate tokens |
| `CurrentUser` decorator | Extract user info from request |
| `ApiResponse` | Standardized API response format |
| `ApiExceptionFilter` | Global exception handling |
| `QueueService` | BullMQ notification queue |
| `RedisModule` | Redis connection |
| `SocketModule` | Socket.IO setup |
| `LoggerModule` | Winston logging |
| `UploadService` | File upload with image processing |

---

### 8. Upload Service (File Upload)

**Location:** `src/shared/services/upload/`

```
upload/
├── index.ts                        # Exports
├── storage-provider.interface.ts   # Storage provider interface
├── local-storage.provider.ts       # Local filesystem storage
├── upload.module.ts                # Dynamic NestJS module
└── upload.service.ts               # Main upload service
```

**Features:**
- ✅ Accept image files: `png`, `jpg`, `jpeg`, `webp`
- ✅ Convert all images to **WebP** format (better compression)
- ✅ Resize images (max 400x400 for avatars)
- ✅ Validate file size (max 5MB)
- ✅ Generate unique filenames
- ✅ Local storage provider (saves to `uploads/` directory)
- ✅ Static file serving at `/uploads/*`
- ✅ Storage provider interface (ready for S3 integration)

**Usage:**
```bash
# Upload avatar
curl -X POST http://localhost:3008/api/users/avatar \
  -H "Authorization: Bearer <token>" \
  -F "avatar=@/path/to/image.png"
```

**Environment Variables:**
```env
UPLOAD_DIR=uploads              # Upload directory
UPLOAD_BASE_URL=/uploads        # URL prefix for uploaded files
UPLOAD_STORAGE_TYPE=local       # Storage type: local | s3 (future)
UPLOAD_MAX_FILE_SIZE=5242880    # Max file size in bytes (5MB)
UPLOAD_IMAGE_QUALITY=80         # WebP quality (1-100)
```

---

### 9. Test Users (Seeded)

| Email | Password | Role |
|-------|----------|------|
| `user@example.com` | `password123` | user |
| `siteowner@example.com` | `password123` | site-owner |
| `admin@example.com` | `password123` | admin |

---
