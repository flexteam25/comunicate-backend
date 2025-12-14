# POCA.GG Backend - Work Log

## Project Overview
POCA.GG is a platform providing information, reviews, and scam reports for Toto/Casino sites.

---

## ✅ Completed

### 1. Project Structure (DDD Architecture)
```
src/
├── modules/                  # DDD modules
│   ├── admin/                # Admin management module
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
| `admins` | Admin info (email, password_hash, display_name, is_active, is_super_admin, last_login_at) |
| `roles` | Roles with type field (user/admin types) |
| `permissions` | System permissions with type field (user/admin types) |
| `badges` | Badge system (user/site types) |
| `user_tokens` | JWT refresh tokens for users (stateful token management) |
| `admin_tokens` | JWT refresh tokens for admins (stateful token management) |
| `user_old_passwords` | User password history (user_id, password_hash, type, created_at) |
| `admin_old_passwords` | Admin password history (admin_id, password_hash, type, created_at) |
| `user_roles` | User-Role mapping (many-to-many) |
| `user_permissions` | User-Permission mapping (many-to-many) |
| `user_badges` | User-Badge mapping (many-to-many) |
| `admin_roles` | Admin-Role mapping (many-to-many, admin type roles only) |
| `admin_permissions` | Admin-Permission mapping (many-to-many, admin type permissions only) |

**User Old Passwords Table:**
- Stores password history when user changes or resets password
- Fields: `id` (uuid), `user_id` (uuid), `password_hash` (varchar), `type` (change/forgot), `created_at` (timestamptz)
- Type: `change` (when user changes password) or `forgot` (when user resets password via OTP)
- Indexed on `user_id` and `created_at` for efficient queries

---

### 3. Authentication Module (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user + auto login | ❌ |
| `POST` | `/api/auth/login` | Login, returns JWT tokens | ❌ |
| `POST` | `/api/auth/refresh` | Refresh access token | ❌ |
| `POST` | `/api/auth/logout` | Logout (revoke current token) | ✅ |
| `POST` | `/api/auth/request-otp` | Request OTP for password reset | ❌ |
| `POST` | `/api/auth/reset-password` | Reset password with OTP verification | ❌ |

**Features:**
- ✅ User registration with email/password
- ✅ Login with JWT (access + refresh tokens)
- ✅ Stateful token management (tokens can be revoked)
- ✅ Logout endpoint to revoke current token
- ✅ Password hashing with bcrypt
- ✅ Auto login after registration
- ✅ OTP-based password reset (6-digit OTP, 3-minute expiry)
- ✅ Password reset with OTP verification
- ✅ All tokens revoked after password reset

**Request OTP:**
- Generates random 6-digit OTP
- Stores OTP in Redis with 3-minute TTL (key: `otp:forgot-password:{userId}`)
- Sends OTP email via queue (non-blocking)
- Prevents duplicate OTP requests (returns message if OTP already exists)
- Security: Doesn't reveal if user exists

**Reset Password:**
- Verifies OTP from Redis cache
- Validates password confirmation match
- Updates password and saves old password to history
- Revokes all user tokens (forces re-login)
- Deletes OTP from Redis after successful reset
- Uses database transaction for data integrity

**Logout:**
- Revokes the current access token
- Token is marked as revoked in database
- Subsequent requests with revoked token will be rejected

---

### 4. User Module (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/users/me` | Get current user info (with roles & badges) | ✅ |
| `PUT` | `/api/users/me` | Update profile (displayName + optional avatar) | ✅ |
| `PUT` | `/api/users/change-password` | Change password | ✅ |
| `GET` | `/api/users/me/badges` | Get current user badges | ✅ |

**Features:**
- ✅ Get current user info with roles and badges
- ✅ Update profile (displayName + optional avatar upload in same request)
- ✅ Change password (requires current password, supports `logoutAll` option)
- ✅ Get user badges list
- ✅ Avatar upload integrated into profile update endpoint

**Change Password:**
- Requires current password for verification
- Supports `logoutAll` option to revoke all user tokens after password change
- If `logoutAll` is true, all tokens for the user are revoked except the current one
- Saves old password to `user_old_passwords` table with type `change`
- Uses database transaction for data integrity

---

### 5. Admin Module (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/admin/login` | Admin login, returns JWT tokens | ❌ |
| `POST` | `/api/admin/refresh` | Refresh access token | ❌ |
| `POST` | `/api/admin/logout` | Logout (revoke current token) | ✅ |
| `POST` | `/api/admin/request-otp` | Request OTP for password reset | ❌ |
| `POST` | `/api/admin/reset-password` | Reset password with OTP verification | ❌ |
| `PUT` | `/api/admin/change-password` | Change password | ✅ |
| `PUT` | `/api/admin/me` | Update profile (displayName) | ✅ |
| `GET` | `/api/admin/me` | Get current admin info | ✅ |
| `POST` | `/api/admin/create` | Create new admin (requires permission) | ✅ |

**Features:**
- ✅ Admin login with JWT (access + refresh tokens)
- ✅ Stateful token management (tokens can be revoked)
- ✅ Logout endpoint to revoke current token
- ✅ OTP-based password reset (6-digit OTP, 3-minute expiry)
- ✅ Password reset with OTP verification
- ✅ Change password (requires current password)
- ✅ Update profile (displayName)
- ✅ Get current admin info
- ✅ Create admin (requires `admin.create` permission)
- ✅ Permission-based access control
- ✅ Super admin support (`is_super_admin` field)
- ✅ All tokens revoked after password reset
- ✅ Password history tracking

**Admin Permission System:**
- `AdminJwtAuthGuard` - Validates admin JWT tokens
- `AdminPermissionGuard` - Checks admin permissions
- `@RequirePermission()` decorator - Declares required permissions for endpoints
- `@CurrentAdmin()` decorator - Extracts admin info from request

**Super Admin:**
- Admins with `is_super_admin = true` bypass permission checks
- Can access all endpoints regardless of assigned permissions

---

### 6. Role & Permission System

**Role Types:**
- `user` - Roles for regular users
- `admin` - Roles for administrators

**Permission Types:**
- `user` - Permissions for regular users
- `admin` - Permissions for administrators

**User Roles (seeded):**
- `user` - Regular user (type: USER)
- `site-owner` - Site owner (type: USER)

**Admin Roles (seeded):**
- `admin` - Administrator (type: ADMIN) - Only used in `admin_roles` table, NOT in `user_roles`

**User Permissions (seeded):**
- `users.create`, `users.read`, `users.update`, `users.delete`
- `sites.create`, `sites.update`, `sites.delete`
- `reviews.moderate`, `scam-reports.moderate`
- `admin.access`

**Admin Permissions (seeded):**
- `admin.create` - Create new admins
- `admin.read` - View admin list
- `admin.update` - Update admin info
- `admin.delete` - Delete admins
- Additional admin-specific permissions

---

### 7. Badge System

**Badge Types:**
- `USER` - Badges for users
- `SITE` - Badges for sites

**Sample Badges (seeded):**
- Early Adopter, Verified User, Top Reviewer (USER type)
- Trusted Site, Premium Site (SITE type)

**Badge Response DTO:**
- Includes: `id`, `name`, `description`, `iconUrl`, `earnedAt`
- Badge icon URLs are built with `buildFullUrl` helper

---

### 8. Shared Infrastructure

| Component | Description |
|-----------|-------------|
| `JwtService` | Generate/verify JWT tokens |
| `PasswordService` | Hash/verify passwords (bcrypt) |
| `JwtAuthGuard` | Protect routes, validate tokens |
| `CurrentUser` decorator | Extract user info from request |
| `ApiResponse` | Standardized API response format |
| `ApiExceptionFilter` | Global exception handling |
| `QueueService` | BullMQ email queue (add jobs) |
| `QueueClientModule` | BullMQ client for adding jobs (used in main app) |
| `QueueWorkerModule` | BullMQ worker for processing jobs (separate process) |
| `EmailProcessor` | Processes email jobs from queue |
| `TransactionService` | Database transaction management |
| `RedisModule` | Redis connection |
| `SocketModule` | Socket.IO setup |
| `LoggerModule` | Winston logging |
| `UploadService` | File upload with image processing |
| `EmailService` | Email sending with multiple SMTP providers (only in queue worker) |
| `buildFullUrl` utility | Helper to build full URLs with API_SERVICE_URL prefix |
| `BadgeResponse` DTO | Badge response structure |
| `RoleResponse` DTO | Role response structure |
| `AdminJwtAuthGuard` | Admin JWT authentication guard |
| `AdminPermissionGuard` | Admin permission checking guard |
| `@RequirePermission()` decorator | Declare required permissions for admin endpoints |
| `@CurrentAdmin()` decorator | Extract admin info from request |

---

### 9. Upload Service (File Upload)

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
- ✅ Convert all images to **WebP** format (better compression, preserves original resolution)
- ✅ No automatic resizing (maintains original image dimensions)
- ✅ Validate file size (max 5MB)
- ✅ Generate unique filenames
- ✅ Local storage provider (saves to `uploads/` directory)
- ✅ Static file serving at `/uploads/*`
- ✅ Storage provider interface (ready for S3 integration)
- ✅ Saves relative paths to database (not full URLs)
- ✅ Builds full URLs only when returning responses

**Usage:**
```bash
# Update profile with avatar (optional)
curl -X PUT http://localhost:3008/api/users/me \
  -H "Authorization: Bearer <token>" \
  -F "displayName=New Name" \
  -F "avatar=@/path/to/image.png"  # Optional
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

### 10. Queue Architecture (BullMQ)

**Location:** `src/shared/queue/`

**Architecture:**
- **QueueClientModule**: Used in main application (`AppModule`) - only adds jobs to queue
- **QueueWorkerModule**: Separate process (`npm run queue-worker:dev`) - processes jobs from queue
- **EmailModule**: Only imported in `QueueWorkerModule`, NOT in `AppModule` (prevents direct email sending)

**Queues:**
- `email` - Email sending queue (OTP, welcome emails, etc.)

**Queue Worker:**
- Separate CLI process: `npm run queue-worker:dev`
- Processes email jobs asynchronously
- Uses same Redis connection as main app (same `REDIS_DB` config)
- Logs to `logs/queue-worker.log`

**Email Processing:**
- All emails must go through queue (no direct sending)
- Jobs are added via `QueueService.addEmailJob()`
- Email is only sent when queue worker is running
- If queue worker is not running, jobs are queued but not processed

**Transaction Support:**
- All POST/PUT methods use `TransactionService.executeInTransaction()` for data integrity
- Ensures atomic operations (all or nothing)
- Used in: register, login, logout, refresh-token, change-password, reset-password, update-profile

---

### 11. Email Service (SMTP)

**Location:** `src/shared/services/email/`

```
email/
├── index.ts                    # Exports
├── email-provider.interface.ts # Email provider interface
├── smtp-email.provider.ts      # SMTP provider implementation
├── email.service.ts            # Main email service
└── email.module.ts             # NestJS module
```

**Features:**
- ✅ Support for multiple SMTP providers
- ✅ Provider-agnostic interface (easy to add new providers)
- ✅ Text and HTML email support
- ✅ Email attachments support
- ✅ CC, BCC, Reply-To support
- ✅ Configuration verification
- ✅ Error logging with LoggerService

**Supported SMTP Providers:**
- ✅ Gmail SMTP
- ✅ Outlook / Office365 SMTP
- ✅ Yahoo SMTP
- ✅ Zoho Mail SMTP
- ✅ Yandex SMTP
- ✅ SendinBlue (Brevo) SMTP
- ✅ Mailgun SMTP
- ✅ SendGrid SMTP
- ✅ Amazon SES SMTP
- ✅ SMTP2Go
- ✅ Postmark SMTP
- ✅ Generic SMTP (custom host/port)

**Usage:**
```typescript
// Inject EmailService
constructor(private readonly emailService: EmailService) {}

// Send text email
await this.emailService.sendTextEmail(
  'user@example.com',
  'Welcome!',
  'Welcome to our platform!'
);

// Send HTML email
await this.emailService.sendHtmlEmail(
  'user@example.com',
  'Welcome!',
  '<h1>Welcome!</h1><p>Welcome to our platform!</p>'
);

// Send email with both text and HTML
await this.emailService.sendEmailWithBoth(
  'user@example.com',
  'Welcome!',
  'Welcome to our platform!',
  '<h1>Welcome!</h1><p>Welcome to our platform!</p>'
);

// Send email with full options
await this.emailService.sendEmail({
  to: ['user1@example.com', 'user2@example.com'],
  cc: 'cc@example.com',
  bcc: 'bcc@example.com',
  subject: 'Important Update',
  text: 'Plain text version',
  html: '<h1>HTML version</h1>',
  attachments: [
    {
      filename: 'document.pdf',
      path: '/path/to/document.pdf',
    },
  ],
  replyTo: 'noreply@example.com',
});
```

**Environment Variables:**
```env
# Email Provider Configuration
EMAIL_PROVIDER=smtp              # Provider: smtp, gmail, outlook, yahoo, zoho, yandex, sendinblue, mailgun, sendgrid, ses, smtp2go, postmark

# SMTP Configuration (required for all providers)
SMTP_HOST=smtp.example.com       # SMTP host (optional for provider-specific configs)
SMTP_PORT=587                    # SMTP port (default: 587)
SMTP_SECURE=false                # Use TLS/SSL (default: false)
SMTP_USER=your-email@example.com # SMTP username
SMTP_PASSWORD=your-password      # SMTP password
SMTP_FROM=noreply@example.com    # Default from address

# AWS SES (if using Amazon SES)
AWS_SES_HOST=email-smtp.us-east-1.amazonaws.com  # Optional, defaults to us-east-1
```

**Provider-Specific Notes:**
- **Gmail**: Requires "App Password" if 2FA is enabled
- **Outlook/Office365**: Uses `smtp.office365.com` by default
- **Yahoo**: Uses `smtp.mail.yahoo.com` by default
- **Zoho**: Uses `smtp.zoho.com` with secure connection
- **Yandex**: Uses `smtp.yandex.com` on port 465
- **SendinBlue/Brevo**: Uses `smtp-relay.brevo.com`
- **Mailgun**: Uses `smtp.mailgun.org`
- **SendGrid**: Uses `smtp.sendgrid.net`
- **Amazon SES**: Configure region-specific host
- **SMTP2Go**: Uses `mail.smtp2go.com`
- **Postmark**: Uses `smtp.postmarkapp.com`

---

### 12. User Response Structure

**UserResponse DTO includes:**
- Basic info: `email`, `displayName`, `avatarUrl`, `isActive`, `lastLoginAt`
- Relations: `roles[]`, `badges[]` (from `/api/users/me` endpoint)
- Timestamps: `createdAt`, `updatedAt`

**BadgeResponse DTO:**
- `id`, `name`, `description`, `iconUrl`, `earnedAt`

**RoleResponse DTO:**
- `id`, `name`

---

### 13. Database Migrations

**New Migrations Added:**
- `1765514782256-add-type-to-roles-and-permissions.ts` - Add `type` field to roles and permissions (user/admin)
- `1765530842314-add-is-super-admin-to-admins.ts` - Add `is_super_admin` field to admins table
- `1765600000000-create-admin-system.ts` - Create admin system tables (admins, admin_tokens, admin_roles, admin_permissions, admin_old_passwords)
- `1765610000000-create-user-extensions.ts` - User system extensions
- `1765620000000-create-post-system.ts` - Post system tables
- `1765630000000-create-scam-report-system.ts` - Scam report system tables
- `1765640000000-create-site-system-part1.ts` - Site system tables (part 1)
- `1765650000000-create-site-system-part2.ts` - Site system tables (part 2)
- `1765660000000-create-site-system-part3.ts` - Site system tables (part 3)

---

### 14. Test Users (Seeded)

**Users (in `users` table):**
| Email | Password | Role |
|-------|----------|------|
| `user@example.com` | `password123` | user |
| `siteowner@example.com` | `password123` | site-owner |

**Note:** Users table does NOT contain admin accounts. Admin accounts are in the `admins` table.

**Test Admins (in `admins` table):**
| Email | Password | Is Super Admin |
|-------|----------|----------------|
| `superadmin@poca.gg` | `SuperAdmin@123` | true |

**Important:**
- Users can only have roles: `user` or `site-owner` (type: USER)
- Admins can only have role: `admin` (type: ADMIN)
- The `user_roles` table does NOT map users to admin role
- The `admin_roles` table maps admins to admin role

---
