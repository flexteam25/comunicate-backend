# POCA.GG Backend - Work Log

## Project Overview
POCA.GG is a platform providing information, reviews, and scam reports for Toto/casino sites.

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
| `POST` | `/api/users/me/favorite-sites/:siteId` | Add site to favorites | ✅ |
| `DELETE` | `/api/users/me/favorite-sites/:siteId` | Remove site from favorites | ✅ |
| `GET` | `/api/users/me/favorite-sites` | List favorite sites (cursor pagination) | ✅ |
| `GET` | `/api/users/me/activity` | Get activity (favorites + recent sites) | ✅ |

**Features:**
- ✅ Get current user info with roles and badges
- ✅ Update profile (displayName + optional avatar upload in same request)
- ✅ Change password (requires current password, supports `logoutAll` option)
- ✅ Get user badges list
- ✅ Avatar upload integrated into profile update endpoint
- ✅ Favorite sites management (add/remove/list)
- ✅ Recent sites tracking (automatically tracked when viewing site)
- ✅ Activity endpoint returns both favorites and recent sites (20 each)
- ✅ Cursor pagination for favorite sites list

**Change Password:**
- Requires current password for verification
- Supports `logoutAll` option to revoke all user tokens after password change
- If `logoutAll` is true, all tokens for the user are revoked except the current one
- Saves old password to `user_old_passwords` table with type `change`
- Uses database transaction for data integrity

**Favorite Sites:**
- Users can add/remove sites from favorites
- Favorite sites are tracked with `createdAt` timestamp
- Unique constraint on `userId` + `siteId` (prevents duplicates)
- Maintains order from database queries when listing

**Recent Sites:**
- Automatically tracked when user views a site (`GET /api/sites/:id`)
- Stores `viewedAt` timestamp in `user_history_sites` table
- Used for "recent sites" feature in activity endpoint
- Returns up to 20 most recent sites

**User Favorite Site Entity:**
- Fields: `userId`, `siteId`, `createdAt`
- Unique constraint on `userId` + `siteId`

**User History Site Entity:**
- Fields: `userId`, `siteId`, `viewedAt`
- Tracks when user last viewed a site

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
- `attendance-statistics` - Attendance statistics calculation queue

**Queue Worker:**
- Separate CLI process: `npm run queue-worker:dev`
- Processes email jobs and attendance statistics jobs asynchronously
- Uses same Redis connection as main app (same `REDIS_DB` config)
- Logs to `logs/queue-worker.log`

**Scheduler:**
- Separate CLI process: `npm run scheduler:dev`
- Uses `@nestjs/schedule` for cron jobs
- Dispatches scheduled jobs to BullMQ queues
- Currently schedules: attendance statistics calculation (every 15 minutes)
- Logs to `logs/scheduler.log`
- PM2 process: `poca-scheduler` in `ecosystem.config.js`

**Email Processing:**
- All emails must go through queue (no direct sending)
- Jobs are added via `QueueService.addEmailJob()`
- Email is only sent when queue worker is running
- If queue worker is not running, jobs are queued but not processed

**Scheduled Jobs:**
- Attendance statistics calculation runs every 15 minutes via cron
- Scheduler dispatches jobs to `attendance-statistics` queue
- Queue worker processes the jobs asynchronously
- Only error logs are kept (info logs removed for cleaner logs)

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

### 15. Site Management Module (Phase 1)

**Location:** `src/modules/site/`

**Admin APIs (`/admin/sites`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/sites` | Create new site | ✅ (permission: `sites.create`) |
| `GET` | `/admin/sites` | List sites (cursor pagination) | ✅ (permission: `sites.read`) |
| `GET` | `/admin/sites/:id` | Get site details | ✅ (permission: `sites.read`) |
| `PUT` | `/admin/sites/:id` | Update site | ✅ (permission: `sites.update`) |
| `DELETE` | `/admin/sites/:id` | Soft delete site | ✅ (permission: `sites.delete`) |
| `PUT` | `/admin/sites/restore/:id` | Restore soft-deleted site | ✅ (permission: `sites.update`) |
| `POST` | `/admin/sites/:id/badges` | Assign badge to site | ✅ (permission: `sites.update`) |
| `DELETE` | `/admin/sites/:id/badges/:badgeId` | Remove badge from site | ✅ (permission: `sites.update`) |
| `POST` | `/admin/sites/:id/domains` | Add domain to site | ✅ (permission: `sites.update`) |
| `PUT` | `/admin/sites/:id/domains/:domainId` | Update site domain | ✅ (permission: `sites.update`) |
| `DELETE` | `/admin/sites/:id/domains/:domainId` | Delete site domain | ✅ (permission: `sites.update`) |

**User APIs (`/api/sites`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/sites` | List sites (verified/monitored only, cursor pagination) | ❌ |
| `GET` | `/api/sites/:id` | Get site details (tracks view) | ❌ |
| `GET` | `/api/site-categories` | List active site categories | ❌ |
| `GET` | `/api/tiers` | List active tiers | ❌ |

**Query Parameters for `/api/sites`:**
- `cursor` - Cursor for pagination
- `limit` - Number of items per page (default: 20)
- `search` - Search by site name or domain
- `categoryId` - Filter by category ID
- `tierId` - Filter by tier ID
- `categoryType` - Filter by category name (toto/casino/all)
- `filterBy` - Filter by ranking field (firstCharge/recharge/experience/reviewCount)
- `sortBy` - Sort field (createdAt, firstCharge, recharge, experience, reviewCount, tier)
- `sortOrder` - Sort order (ASC/DESC, default: DESC)

**Features:**
- ✅ Site CRUD operations with permission checks
- ✅ Super admin bypass for all operations
- ✅ Cursor pagination for listing sites
- ✅ Search by site name or domain
- ✅ Soft delete and restore functionality
- ✅ Site badge assignment (many-to-many)
- ✅ Site domain management (one site, many domains)
- ✅ Image uploads for `logo_url`, `main_image_url`, and `site_image_url` (max 5MB, stored in `uploads/sites/site_id/`)
- ✅ Site view tracking (increments view count, tracks user history)
- ✅ All create/update operations wrapped in transactions
- ✅ Filter by `is_active` status
- ✅ Filter by category, tier, status, categoryType
- ✅ Filter by ranking fields (firstCharge, recharge, experience, reviewCount)
- ✅ Sort by ranking fields with NULL values at end when DESC
- ✅ User-facing APIs only show verified/monitored sites
- ✅ API responses use `null` instead of `undefined` for optional fields (ensures all keys present)

**Site Entity:**
- Fields: `name`, `description`, `logoUrl`, `mainImageUrl`, `siteImageUrl`, `websiteUrl`, `status` (pending/verified/monitored/rejected), `categoryId`, `tierId`, `isActive`, `deletedAt`, `firstCharge` (%), `recharge` (%), `experience` (points)
- Relationships: `category`, `tier`, `badges[]`, `domains[]`, `views[]`
- Ranking fields: `firstCharge` (decimal, percentage), `recharge` (decimal, percentage), `experience` (integer, experience points)

**Site Domain Entity:**
- Fields: `siteId`, `domain`, `isCurrent` (boolean)
- One site can have multiple domains
- Only one domain can be `isCurrent = true` at a time

---

### 16. Site Category Management Module

**Location:** `src/modules/site/`

**Admin APIs (`/admin/site-categories`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/site-categories` | Create category | ✅ (permission: `sites.create`) |
| `GET` | `/admin/site-categories` | List categories | ✅ (permission: `sites.read`) |
| `GET` | `/admin/site-categories/:id` | Get category | ✅ (permission: `sites.read`) |
| `PUT` | `/admin/site-categories/:id` | Update category | ✅ (permission: `sites.update`) |
| `DELETE` | `/admin/site-categories/:id` | Soft delete category | ✅ (permission: `sites.delete`) |
| `PUT` | `/admin/site-categories/restore/:id` | Restore category | ✅ (permission: `sites.update`) |

**Features:**
- ✅ Category CRUD with permission checks
- ✅ Super admin bypass
- ✅ Soft delete and restore
- ✅ `is_active` flag support
- ✅ All operations wrapped in transactions
- ✅ Filter by `is_active` status

**Site Category Entity:**
- Fields: `name`, `description`, `isActive`, `deletedAt`

---

### 17. Tier Management Module

**Location:** `src/modules/tier/`

**Admin APIs (`/admin/tiers`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/tiers` | Create tier | ✅ (permission: `sites.create`) |
| `GET` | `/admin/tiers` | List tiers | ✅ (permission: `sites.read`) |
| `GET` | `/admin/tiers/:id` | Get tier | ✅ (permission: `sites.read`) |
| `PUT` | `/admin/tiers/:id` | Update tier | ✅ (permission: `sites.update`) |
| `DELETE` | `/admin/tiers/:id` | Soft delete tier | ✅ (permission: `sites.delete`) |
| `PUT` | `/admin/tiers/restore/:id` | Restore tier | ✅ (permission: `sites.update`) |

**User APIs (`/api/tiers`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/tiers` | List active tiers | ❌ |

**Features:**
- ✅ Tier CRUD with permission checks
- ✅ Super admin bypass
- ✅ Soft delete and restore
- ✅ `is_active` flag support
- ✅ All operations wrapped in transactions
- ✅ Filter by `is_active` status
- ✅ One-to-one relationship with sites (one site has one tier)

**Tier Entity:**
- Fields: `name`, `description`, `level`, `isActive`, `deletedAt`

---

### 18. Badge Management Module (Admin)

**Location:** `src/modules/badge/`

**Admin APIs (`/admin/badges`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/badges` | Create badge | ✅ (permission: `badges.create`) |
| `GET` | `/admin/badges` | List badges | ✅ (permission: `badges.read`) |
| `GET` | `/admin/badges/:id` | Get badge | ✅ (permission: `badges.read`) |
| `PUT` | `/admin/badges/:id` | Update badge | ✅ (permission: `badges.update`) |
| `DELETE` | `/admin/badges/:id` | Soft delete badge | ✅ (permission: `badges.delete`) |
| `PUT` | `/admin/badges/restore/:id` | Restore badge | ✅ (permission: `badges.update`) |

**Features:**
- ✅ Badge CRUD with permission checks
- ✅ Super admin bypass
- ✅ Soft delete and restore (if `deleted_at` column exists)
- ✅ `is_active` flag support
- ✅ Filter by `is_active` status
- ✅ Badge types: `USER` and `SITE`

**Badge Entity:**
- Fields: `name`, `description`, `iconUrl`, `type` (USER/SITE), `isActive`, `deletedAt` (if applicable)

---

### 19. User Badge Assignment (Admin)

**Location:** `src/modules/admin/` and `src/modules/user/`

**Admin APIs (`/admin/users/:userId/badges`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/users/:userId/badges` | Assign badge to user | ✅ (permission: `users.update`) |
| `DELETE` | `/admin/users/:userId/badges/:badgeId` | Remove badge from user | ✅ (permission: `users.update`) |

**Features:**
- ✅ Assign badges to users (many-to-many)
- ✅ Remove badges from users
- ✅ Permission checks with super admin bypass
- ✅ Validates badge type is `USER`
- ✅ All operations wrapped in transactions

---

### 20. User Profile Extensions

**Updated User APIs:**

| Method | Endpoint | Description | Changes |
|--------|----------|-------------|---------|
| `PUT` | `/api/users/me` | Update profile | ✅ Now updates `user_profiles` table (bio, phone, birthDate, gender) |
| `GET` | `/api/users/me` | Get profile | ✅ Returns `user_profiles` data (bio, phone, birthDate, gender) |

**User Profile Entity:**
- Fields: `userId`, `bio`, `phone`, `birthDate`, `gender`
- One-to-one relationship with `User`
- Created automatically when user registers

**Features:**
- ✅ Update user profile information (displayName, avatar, bio, phone, birthDate, gender)
- ✅ Profile data included in user response
- ✅ All updates wrapped in transactions
- ✅ API responses use `null` instead of `undefined` for optional fields

---

### 21. Cursor Pagination

**Location:** `src/shared/utils/cursor-pagination.util.ts`

**Features:**
- ✅ Efficient pagination for large datasets
- ✅ Uses cursor-based approach (better than offset-based for large data)
- ✅ Supports `nextCursor` and `prevCursor`
- ✅ Used in site listing APIs

**Usage:**
```typescript
const result = await this.siteRepository.findAllWithCursor({
  limit: 20,
  cursor: query.cursor,
  filters: { search, categoryId, tierId, status, isActive }
});
```

---

### 22. Database Migrations (Additional)

**New Migrations Added:**
- `1765670000000-add-is-active-to-badges-tiers-categories.ts` - Add `is_active` column to `badges`, `tiers`, and `site_categories` tables
- `1765680000000-add-deleted-at-to-tiers-categories.ts` - Add `deleted_at` column to `tiers` and `site_categories` tables for soft delete
- `1765863000001-create-user-history-sites.ts` - Creates `user_favorite_sites` and `user_history_sites` tables
- `1765935823716-add-site-image-url-to-sites.ts` - Adds `site_image_url` column to `sites` table
- `1765955273683-create-attendance-system.ts` - Creates `attendances` and `attendance_statistics` tables
- `1766022483806-add-ranking-fields-to-sites.ts` - Adds `first_charge`, `recharge`, `experience` columns to `sites` table

---

### 23. Seeder Updates

**Updated Seeders:**
- ✅ `auth-user-seeder.ts` - Refactored to use upsert pattern (update or create) to prevent errors on re-run
- ✅ `auth-admin-seeder.ts` - Refactored to use upsert pattern (update or create) to prevent errors on re-run

**Seeder Pattern:**
- All seeders now check for existing data before creating
- Updates existing records if found, creates new if not found
- Prevents duplicate key errors when re-running seeders

---

### 24. Upload Service Enhancements

**Location:** `src/shared/services/upload/upload.service.ts`

**New Methods:**
- ✅ `uploadSiteImage()` - Handles site-specific image uploads (logo, main image, site image)
- ✅ Stores images in `uploads/sites/site_id/` directory
- ✅ Max file size: 5MB
- ✅ Converts to WebP format
- ✅ Generates unique filenames

**Usage:**
```typescript
// Upload site logo
const logoUrl = await this.uploadService.uploadSiteImage(
  file,
  siteId,
  'logo'
);

// Upload site main image
const mainImageUrl = await this.uploadService.uploadSiteImage(
  file,
  siteId,
  'main-image'
);

// Upload site image
const siteImageUrl = await this.uploadService.uploadSiteImage(
  file,
  siteId,
  'site-image'
);
```

---

### 25. Dependency Injection Fixes

**Changes:**
- ✅ Created `AdminGuardsModule` to properly export admin guards and decorators
- ✅ Fixed circular dependency issues between modules
- ✅ Created `UserTokenRepositoryModule` to properly export user token repository
- ✅ Updated `AuthModule` to use proper module imports

**Modules Updated:**
- `AdminModule` - Exports guards and decorators via `AdminGuardsModule`
- `AuthModule` - Uses `UserTokenRepositoryModule` for proper dependency injection
- `SiteModule` - Imports `AdminModule` for admin guard dependencies
- `TierModule` - Uses `forwardRef` to handle circular dependencies with `SiteModule`

---

### 26. Attendance System Module

**Location:** `src/modules/attendance/`

**User APIs (`/api/attendances`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/attendances` | Create attendance (check-in) | ✅ |
| `GET` | `/api/attendances` | List attendances with statistics (cursor pagination) | ✅ |

**Features:**
- ✅ Daily check-in system for users
- ✅ Attendance statistics tracking (total days, current streak, rank)
- ✅ Cursor pagination for attendance list
- ✅ Filter by date (`today`, `streak`, `total`)
- ✅ Rank by attendance time (`rankByTime`)
- ✅ Daily message support
- ✅ Automatic statistics calculation via scheduled job

**Attendance Entity:**
- Fields: `userId`, `message` (optional), `createdAt`
- One user can check in once per day

**Attendance Statistic Entity:**
- Fields: `userId`, `statisticDate`, `totalAttendanceDays`, `currentStreak`, `attendanceTime`, `attendanceRank`, `dailyMessage`
- Unique constraint on `userId` + `statisticDate`
- Rank calculated based on check-in time (earlier = better rank)

**Scheduled Statistics Calculation:**
- ✅ Cron job runs every 15 minutes (`@nestjs/schedule`)
- ✅ Dispatches jobs to BullMQ queue (`attendance-statistics`)
- ✅ Separate scheduler process (`npm run scheduler:dev`)
- ✅ Processed by queue worker (`AttendanceStatisticsProcessor`)
- ✅ Batch processing to avoid N+1 queries
- ✅ Calculates rank based on check-in time (ASC order)
- ✅ Only error logs kept (info logs removed for cleaner logs)

**Scheduler Architecture:**
- **Scheduler Command**: Separate CLI process for cron scheduling (`src/commands/scheduler/`)
- **Scheduler Service**: `AttendanceStatisticsSchedulerService` - dispatches jobs to queue
- **Queue Processor**: `AttendanceStatisticsProcessor` - processes jobs in queue worker
- **PM2 Configuration**: Separate process `poca-scheduler` in `ecosystem.config.js`
- **Logging**: Logs to `logs/scheduler.log`, only error logs kept

---
