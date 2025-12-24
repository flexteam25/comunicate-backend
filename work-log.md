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
- `1765630000000-create-scam-report-system.ts` - Scam report system tables (scam_reports, scam_report_comments, scam_report_comment_images, scam_report_reactions)
- `1766042980435-create-scam-report-images.ts` - Creates `scam_report_images` table
- `1766043000000-add-indexes-to-scam-reports.ts` - Adds foreign keys and indexes to `scam_reports` table
- `1766049539981-remove-like-count-from-scam-report-comments.ts` - Removes `like_count` column from `scam_report_comments` table
- `1766051045757-drop-scam-report-site-table.ts` - Drops redundant `scam_report_site` table
- `1766118140089-update-site-reviews-schema.ts` - Removes `like_count` from `site_reviews` and `site_review_comments`, changes `is_published` default to `false`
- `1765640000000-create-site-system-part1.ts` - Site system tables (part 1)
- `1765650000000-create-site-system-part2.ts` - Site system tables (part 2)
- `1765660000000-create-site-system-part3.ts` - Site system tables (part 3)
- `1766042980435-create-scam-report-images.ts` - Creates `scam_report_images` table
- `1766043000000-add-indexes-to-scam-reports.ts` - Adds foreign keys and indexes to `scam_reports` table
- `1766049539981-remove-like-count-from-scam-report-comments.ts` - Removes `like_count` column from `scam_report_comments` table
- `1766051045757-drop-scam-report-site-table.ts` - Drops redundant `scam_report_site` table

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
| `GET` | `/api/sites/:id/scam-reports` | List published scam reports for a site | ❌ |
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
- ✅ `issueCount` field: Count of published scam reports per site (loaded via `loadRelationCountAndMap`)
- ✅ Relationship with `ScamReport` entity for counting scam reports

**Site Entity:**
- Fields: `name`, `description`, `logoUrl`, `mainImageUrl`, `siteImageUrl`, `websiteUrl`, `status` (pending/verified/monitored/rejected), `categoryId`, `tierId`, `isActive`, `deletedAt`, `firstCharge` (%), `recharge` (%), `experience` (points), `issueCount` (computed, number of published scam reports)
- Relationships: `category`, `tier`, `badges[]`, `domains[]`, `views[]`, `scamReports[]`
- Ranking fields: `firstCharge` (decimal, percentage), `recharge` (decimal, percentage), `experience` (integer, experience points)
- Computed properties: `issueCount` (loaded via `loadRelationCountAndMap`, counts published scam reports)

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
- Fields: `userId`, `bio`, `phone`, `birthDate`, `gender`, `points` (integer, default: 0)
- One-to-one relationship with `User`
- Created automatically when user registers with default `points = 0`

**Features:**
- ✅ Update user profile information (displayName, avatar, bio, phone, birthDate, gender)
- ✅ Points field: Integer field to track user points (default: 0)
- ✅ Profile data included in user response (including points)
- ✅ All updates wrapped in transactions
- ✅ API responses use `null` instead of `undefined` for optional fields
- ✅ GET `/api/users/me` returns `points` field

**Database Schema:**
- ✅ Migration `1766398700563-add-points-to-user-profiles.ts`:
  - Adds `points` column (integer, default: 0) to `user_profiles` table

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
- `1766398700563-add-points-to-user-profiles.ts` - Adds `points` column (integer, default: 0) to `user_profiles` table

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

### 24. Upload Service Enhancements & File Upload Refactoring

**Location:** `src/shared/services/upload/upload.service.ts`

**New Methods:**
- ✅ `uploadSiteImage()` - Handles site-specific image uploads (logo, main image, site image)
- ✅ Stores images in `uploads/sites/site_id/` directory
- ✅ Max file size: 5MB
- ✅ Converts to WebP format
- ✅ Generates unique filenames

**File Upload Refactoring:**
- ✅ **Moved upload logic from controllers to use cases** - All file upload operations now happen in use cases
- ✅ **Transaction integrity** - Files are uploaded before database transaction, ensuring consistency
- ✅ **Cleanup orphaned files** - If database transaction fails, uploaded files are automatically deleted
- ✅ **Max file size: 20MB** - All image uploads now support up to 20MB
- ✅ **Consistent pattern** - All create/update operations follow: upload → transaction → cleanup on failure

**Refactored Modules:**
- ✅ **Site Module** - `createSite()`, `updateSite()` - Uploads `logo`, `mainImage`, `siteImage` in use case
- ✅ **Post Module** - `createPost()`, `updatePost()` (admin/user) - Uploads `thumbnail` in use case
- ✅ **POCA Event Module** - `createPocaEvent()`, `updatePocaEvent()` - Uploads `primaryBanner`, `banners` in use case
- ✅ **Gifticon Module** - `createGifticon()`, `updateGifticon()` - Uploads `image` in use case
- ✅ **Post Comment Module** - `addComment()` - Uploads comment images in use case

**Usage Pattern:**
```typescript
// 1. Upload file before transaction
let fileUrl: string | undefined;
if (file) {
  try {
    const result = await this.uploadService.uploadImage(file, {
      folder: 'folder/name',
    });
    fileUrl = result.relativePath;
  } catch (error) {
    throw new BadRequestException('Failed to upload file');
  }
}

// 2. Create/Update in transaction
try {
  return await this.transactionService.executeInTransaction(
    async (manager: EntityManager) => {
      // Database operations...
    },
  );
} catch (error) {
  // 3. Cleanup on failure
  if (fileUrl) {
    await this.uploadService.deleteFile(fileUrl);
  }
  throw error;
}
```

---

### 25. Dependency Injection Fixes

**Changes:**
- ✅ Created `AdminGuardsModule` to properly export admin guards and decorators
- ✅ Fixed circular dependency issues between modules
- ✅ Created `UserTokenRepositoryModule` to properly export user token repository
- ✅ Updated `AuthModule` to use proper module imports
- ✅ Fixed `JwtAuthGuard` dependency injection issues across multiple modules

**Modules Updated:**
- `AdminModule` - Exports guards and decorators via `AdminGuardsModule`
- `AuthModule` - Uses `UserTokenRepositoryModule` for proper dependency injection
- `SiteModule` - Imports `AdminModule` and `UserTokenRepositoryModule` for guard dependencies
- `TierModule` - Uses `forwardRef` to handle circular dependencies with `SiteModule`
- `SiteManagerModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `SiteReviewModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `ScamReportModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `PostModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `PocaEventModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `SupportModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `UserModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `AttendanceModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`
- `GifticonModule` - Imports `UserTokenRepositoryModule` and `PointModule` for guard dependencies
- `PointModule` - Imports `UserTokenRepositoryModule` for `JwtAuthGuard`

**Issue Fixed:**
- ✅ `UnknownDependenciesException` for `JwtAuthGuard` - `IUserTokenRepository` not available in module context
- ✅ Solution: Import `UserTokenRepositoryModule` in all modules that use `JwtAuthGuard`

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

### 27. Scam Report System

**Location:** `src/modules/scam-report/`

**User APIs (`/api/scam-reports`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/scam-reports` | Create scam report with images | ✅ |
| `GET` | `/api/scam-reports` | List published scam reports (search by siteName) | ❌ |
| `GET` | `/api/scam-reports/:id` | Get scam report details | ❌ |
| `PUT` | `/api/scam-reports/:id` | Update own scam report | ✅ |
| `DELETE` | `/api/scam-reports/:id` | Delete own scam report | ✅ |
| `POST` | `/api/scam-reports/:id/react` | React to scam report (like/dislike) | ✅ |
| `GET` | `/api/scam-reports/:id/comments` | List comments for scam report | ❌ |
| `POST` | `/api/scam-reports/:id/comments` | Add comment to scam report | ✅ |
| `DELETE` | `/api/scam-reports/comments/:commentId` | Soft delete own comment | ✅ |
| `GET` | `/api/my-scam-reports` | List own scam reports (all statuses) | ✅ |

**Admin APIs (`/admin/scam-reports`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/admin/scam-reports` | List all scam reports (cursor pagination) | ✅ |
| `GET` | `/admin/scam-reports/:id` | Get scam report details | ✅ |
| `POST` | `/admin/scam-reports/:id/approve` | Approve scam report (status: published) | ✅ |
| `POST` | `/admin/scam-reports/:id/reject` | Reject scam report (status: rejected) | ✅ |

**Features:**
- ✅ Scam report CRUD with permission checks
- ✅ Image uploads for scam reports (multiple images per report)
- ✅ Image uploads for comments (multiple images per comment)
- ✅ Status workflow: `pending` → `published` or `rejected` (one-way)
- ✅ Public users can only view published reports
- ✅ Owners can view/edit/delete own reports regardless of status
- ✅ Reaction system (like/dislike) with unique constraint per user
- ✅ Comment system with nested replies support
- ✅ Top-level comments only by default (filter by `parentCommentId` for replies)
- ✅ Soft delete for comments
- ✅ Validation: Cannot retrieve replies if parent comment is soft-deleted
- ✅ Cursor pagination for listing reports and comments
- ✅ Search by site name (not siteId)
- ✅ Reaction counts calculated via database subqueries (no N+1 queries)
- ✅ `issueCount` field on sites: Count of published scam reports per site
- ✅ Relationship between `Site` and `ScamReport` entities
- ✅ `loadRelationCountAndMap` used to count scam reports efficiently
- ✅ User comment tracking: Saves to `user_comments` table for future statistics

**Scam Report Entity:**
- Fields: `userId`, `siteId` (optional), `title`, `description`, `amount` (optional), `status` (pending/published/rejected), `adminId`, `reviewedAt`
- Relationships: `user`, `site`, `admin`, `images[]`, `comments[]`, `reactions[]`
- Status: `pending` (default), `published` (approved), `rejected`

**Scam Report Image Entity:**
- Fields: `scamReportId`, `imageUrl`, `order`
- Multiple images per report

**Scam Report Comment Entity:**
- Fields: `scamReportId`, `userId`, `parentCommentId` (optional, for replies), `content`
- Relationships: `scamReport`, `user`, `parentComment`, `replies[]`, `images[]`
- Supports nested comments (replies to comments)

**Scam Report Comment Image Entity:**
- Fields: `commentId`, `imageUrl`, `order`
- Multiple images per comment

**Scam Report Reaction Entity:**
- Fields: `scamReportId`, `userId`, `reactionType` (like/dislike)
- Unique constraint: One reaction per user per report

**User Comment Entity:**
- Fields: `userId`, `commentType` (POST_COMMENT, SITE_REVIEW_COMMENT, SCAM_REPORT_COMMENT), `commentId`
- Polymorphic association for tracking all user comments across different types
- Used for future statistics

**Integration with Site Module:**
- `Site` entity has `OneToMany` relationship with `ScamReport`
- `issueCount` computed property on `Site` entity (counts published scam reports)
- `/api/sites/:id/scam-reports` endpoint to list published scam reports for a site
- `issueCount` included in site list and detail APIs
- Uses `loadRelationCountAndMap` for efficient counting (no N+1 queries)

---

### 28. Site Review System

**Location:** `src/modules/site-review/`

**User APIs (`/api/site-reviews`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/site-reviews` | Create site review (upsert pattern - throws error if exists) | ✅ |
| `GET` | `/api/site-reviews` | List published site reviews for a site | ❌ |
| `GET` | `/api/site-reviews/:id` | Get site review details | ❌ |
| `PUT` | `/api/site-reviews/:id` | Update own site review (within 2 hours) | ✅ |
| `DELETE` | `/api/site-reviews/:id` | Delete own site review | ✅ |
| `POST` | `/api/site-reviews/:id/react` | React to site review (like/dislike) | ✅ |
| `GET` | `/api/site-reviews/:id/comments` | List comments for site review | ❌ |
| `POST` | `/api/site-reviews/:id/comments` | Add comment to site review | ✅ |
| `DELETE` | `/api/site-reviews/comments/:commentId` | Soft delete own comment | ✅ |
| `GET` | `/api/site-reviews/my-site-reviews` | List own site reviews (all statuses) | ✅ |

**Admin APIs (`/admin/site-reviews`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/admin/site-reviews` | List all site reviews (cursor pagination) | ✅ |
| `GET` | `/admin/site-reviews/:id` | Get site review details | ✅ |
| `POST` | `/admin/site-reviews/:id/approve` | Approve site review (isPublished: true) | ✅ |
| `POST` | `/admin/site-reviews/:id/reject` | Reject site review (isPublished: false) | ✅ |

**Features:**
- ✅ Site review CRUD with permission checks
- ✅ Rating system (1-5 stars)
- ✅ Title and content required
- ✅ Upsert pattern: Throws error if review already exists (no update on create)
- ✅ Update allowed only within 2 hours after submission
- ✅ Status workflow: `isPublished: false` (default) → `true` (approved by admin)
- ✅ Public users can only view published reviews
- ✅ Owners can view/edit/delete own reviews regardless of status
- ✅ Reaction system (like/dislike) with unique constraint per user
- ✅ Comment system with nested replies support
- ✅ Top-level comments only by default (filter by `parentCommentId` for replies)
- ✅ Soft delete for comments
- ✅ Validation: Cannot retrieve replies if parent comment is soft-deleted
- ✅ Cursor pagination for listing reviews and comments
- ✅ Sorting: Newest (createdAt DESC), Highest Rating (rating DESC), Lowest Rating (rating ASC)
- ✅ Search by title (user API) or title/reviewer name (admin API)
- ✅ Filter by rating (1-5)
- ✅ Reaction counts calculated via database subqueries (no N+1 queries)
- ✅ Comment counts loaded via `loadRelationCountAndMap`
- ✅ Site statistics: Automatically calculates and updates `review_count` and `average_rating` on sites table
- ✅ Statistics recalculation: Triggered on create/update/delete/approve/reject
- ✅ User comment tracking: Saves to `user_comments` table for future statistics
- ✅ Empty string handling: `parentCommentId=""` converted to `undefined` for top-level comments

**Site Review Entity:**
- Fields: `siteId`, `userId`, `rating` (1-5), `title`, `content`, `isPublished` (default: false)
- Relationships: `site`, `user`, `reactions[]`, `comments[]`
- Unique constraint: One review per user per site (`(site_id, user_id)`)
- Computed properties: `likeCount`, `dislikeCount`, `commentCount` (loaded via subqueries/loadRelationCountAndMap)

**Site Review Reaction Entity:**
- Fields: `siteReviewId`, `userId`, `reactionType` (like/dislike)
- Unique constraint: One reaction per user per review
- Column mapping: `review_id` (database) → `siteReviewId` (entity)

**Site Review Comment Entity:**
- Fields: `siteReviewId`, `userId`, `parentCommentId` (optional, for replies), `content`
- Relationships: `siteReview`, `user`, `parentComment`, `replies[]`
- Supports nested comments (replies to comments)
- No `like_count` field (removed via migration)

**Database Schema Updates:**
- ✅ Migration `1766118140089-update-site-reviews-schema.ts`:
  - Removed `like_count` from `site_reviews` table
  - Removed `like_count` from `site_review_comments` table
  - Changed `is_published` default from `true` to `false`

**Integration with Site Module:**
- `Site` entity already has `review_count` and `average_rating` columns
- Statistics automatically updated when reviews are created/updated/deleted/approved/rejected
- Only published reviews count towards statistics
- Uses raw SQL query in `recalculateSiteStatistics` to avoid circular dependencies

---

### 29. Inquiry System (Refactored)

**Location:** `src/modules/support/`

**User APIs (`/api/support`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/support/inquiry-categories` | Get inquiry categories (public) | ❌ |
| `GET` | `/api/support/inquiries` | List own inquiries (cursor pagination) | ✅ |
| `POST` | `/api/support/inquiries` | Create inquiry with images | ✅ |
| `PUT` | `/api/support/inquiries/:id` | Update own inquiry | ✅ |

**Admin APIs (`/admin/support`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/admin/support/inquiries/statuses` | Get inquiry status options | ✅ |
| `GET` | `/admin/support/inquiries` | List all inquiries (cursor pagination) | ✅ |
| `GET` | `/admin/support/inquiries/:id` | Get inquiry details | ✅ |
| `PUT` | `/admin/support/inquiries/:id/reply` | Reply to inquiry | ✅ |

**Features:**
- ✅ Inquiry CRUD with permission checks
- ✅ Title and category fields (required)
- ✅ Category enum: `inquiry`, `feedback`, `bug`, `advertisement`
- ✅ Public API endpoint to get inquiry categories
- ✅ Image uploads for inquiries (multiple images per inquiry, max 10)
- ✅ Status workflow: `pending` → `processing` → `resolved` or `closed`
- ✅ Admin reply functionality
- ✅ Cursor pagination for listing inquiries
- ✅ Filter by status, category, userId, adminId
- ✅ Search and sort capabilities
- ✅ Removed separate Feedback, BugReport, and AdvertisingContact entities (consolidated into Inquiry with category)

**Inquiry Entity:**
- Fields: `userId`, `title`, `category` (inquiry/feedback/bug/advertisement), `message`, `images[]`, `status` (pending/processing/closed/resolved), `adminId`, `adminReply`, `repliedAt`
- Relationships: `user`, `admin`
- Category enum: `InquiryCategory.INQUIRY`, `InquiryCategory.FEEDBACK`, `InquiryCategory.BUG`, `InquiryCategory.ADVERTISEMENT`

**Database Schema:**
- ✅ Migration `1766137602873-update-inquiry-system.ts`:
  - Added `title` column (varchar 255, required) to `inquiries` table
  - Added `category` column (enum: inquiry/feedback/bug/advertisement, default: inquiry) to `inquiries` table
  - Dropped `feedbacks` table
  - Dropped `bug_reports` table
  - Dropped `advertising_contacts` table

**Refactoring:**
- ✅ Removed Feedback, BugReport, and AdvertisingContact entities
- ✅ Consolidated all support requests into single Inquiry entity with category field
- ✅ Updated all DTOs, use cases, and controllers
- ✅ Removed unused repositories and use cases
- ✅ Updated app.module.ts, scheduler.module.ts, queue-worker.module.ts, and migration.ts to remove deleted entity references

---

### 30. Site Manager Application System

**Location:** `src/modules/site-manager/`

**User APIs (`/api/site-management`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/site-management/apply` | Apply to become site manager | ✅ |
| `GET` | `/api/site-management/my-managed-sites` | List sites managed by current user | ✅ |
| `GET` | `/api/site-management/my-applications` | List own applications (cursor pagination) | ✅ |
| `PUT` | `/api/site-management/managed-sites/:siteId` | Update managed site | ✅ |

**Admin APIs (`/admin/site-manager-applications`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/admin/site-manager-applications` | List all applications (cursor pagination) | ✅ |
| `GET` | `/admin/site-manager-applications/:id` | Get application details | ✅ |
| `POST` | `/admin/site-manager-applications/:id/approve` | Approve application | ✅ |
| `POST` | `/admin/site-manager-applications/:id/reject` | Reject application | ✅ |

**Features:**
- ✅ Site manager application system
- ✅ Users can apply to manage a site (with message)
- ✅ One user can only have one pending application per site
- ✅ Users can re-apply if their application was rejected (creates new application, keeps history)
- ✅ Unique constraint: One user can manage one site at a time (`(user_id, site_id)` unique in `site_managers`)
- ✅ Single site can have multiple managers
- ✅ Site managers can get sites they manage and edit them (not delete)
- ✅ Site managers can view their own application submissions
- ✅ Admin can approve/reject applications (requires `site-manager-applications.approve` permission)
- ✅ Race condition prevention: Uses pessimistic locking (`SELECT ... FOR UPDATE`) in approve/reject operations
- ✅ File upload support for `logo`, `mainImage`, and `siteImage` in update managed site endpoint
- ✅ Filter applications by `siteName` (partial match, case-insensitive) instead of `siteId`

**Site Manager Application Entity:**
- Fields: `siteId`, `userId`, `message`, `status` (pending/approved/rejected), `adminId`, `reviewedAt`
- Relationships: `site`, `user`, `admin`
- Status: `pending` (default), `approved`, `rejected`
- Partial unique index: `UNIQUE(site_id, user_id) WHERE status = 'pending'` (allows multiple applications with different statuses but only one pending per user per site)

**Site Manager Entity:**
- Fields: `siteId`, `userId`, `createdAt`
- Relationships: `site`, `user`
- Unique constraint: `(user_id, site_id)` - one user can only manage one site at a time

---

### 31. POCA Events System

**Location:** `src/modules/poca-event/`

**User APIs (`/api/poca-events`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/poca-events` | List visible published events (cursor pagination) | ❌ |
| `GET` | `/api/poca-events/:idOrSlug` | Get event detail (tracks view) | ❌ |

**Admin APIs (`/admin/poca-events`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/poca-events` | Create event with file uploads | ✅ |
| `PUT` | `/admin/poca-events/:id` | Update event (all fields, with file uploads) | ✅ |
| `DELETE` | `/admin/poca-events/:id` | Soft delete event | ✅ |
| `GET` | `/admin/poca-events` | List all events (cursor pagination) | ✅ |
| `GET` | `/admin/poca-events/:id` | Get event detail | ✅ |

**Features:**
- ✅ Global events system (not site-specific)
- ✅ Event CRUD with permission checks (`gifticons.manage` permission)
- ✅ Status workflow: `draft` → `published` → `archived`
- ✅ Time window: `startsAt` and `endsAt` for event visibility
- ✅ Slug support (auto-generated from title or manually provided)
- ✅ View tracking: Increments `viewCount` and creates `PocaEventView` records
- ✅ Banner system: Primary banner + multiple additional banners with order
- ✅ File upload: Form-data with `primaryBanner` and `banners` (multiple files)
- ✅ Banner order: `bannersOrder` JSON array to specify order
- ✅ Delete banners: `deletePrimaryBanner` and `deleteBanners` flags in update
- ✅ Cursor pagination for listing events
- ✅ Visibility rules: Only `published` events with valid time window are visible to users
- ✅ IP address and user agent tracking for views
- ✅ Optional JWT auth for user APIs (to track userId in views, but not required)

**POCA Event Entity:**
- Fields: `title`, `slug` (unique, nullable), `summary`, `content`, `status` (draft/published/archived), `startsAt`, `endsAt`, `primaryBannerUrl`, `viewCount`
- Relationships: `banners[]`, `views[]`

**POCA Event Banner Entity:**
- Fields: `eventId`, `imageUrl`, `order`
- Multiple banners per event with order

**POCA Event View Entity:**
- Fields: `eventId`, `userId` (nullable), `ipAddress`, `userAgent` (nullable)
- Tracks event views for analytics

**Database Schema:**
- ✅ Migration `1766389788887-create-poca-events-system.ts`:
  - Creates `poca_events` table with status enum
  - Creates `poca_event_banners` table
  - Creates `poca_event_views` table
  - Indexes for status, slug, starts_at, ends_at

---

### 32. Gifticon Management System

**Location:** `src/modules/gifticon/`

**User APIs (`/api/gifticons`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/gifticons` | List visible published gifticons (cursor pagination) | ❌ |
| `GET` | `/api/gifticons/:idOrSlug` | Get gifticon detail | ❌ |

**Admin APIs (`/admin/gifticons`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/gifticons` | Create gifticon with file upload | ✅ |
| `PUT` | `/admin/gifticons/:id` | Update gifticon (all fields, with file upload) | ✅ |
| `DELETE` | `/admin/gifticons/:id` | Soft delete gifticon | ✅ |
| `GET` | `/admin/gifticons` | List all gifticons (cursor pagination) | ✅ |
| `GET` | `/admin/gifticons/:id` | Get gifticon detail | ✅ |

**Features:**
- ✅ Gifticon management system (reward system with points redemption)
- ✅ Gifticon CRUD with permission checks (`gifticons.manage` permission)
- ✅ Status workflow: `draft` → `published` → `archived`
- ✅ Time window: `startsAt` and `endsAt` for gifticon visibility
- ✅ Slug support (auto-generated from title or manually provided)
- ✅ Amount field: Points required to redeem gifticon (integer, minimum 0)
- ✅ Single image: One main image (`image_url`), no banners
- ✅ Rich text content: HTML content from editor (can contain multiple images in HTML)
- ✅ File upload: Form-data with `image` field (single file, max 5MB)
- ✅ Delete image: `deleteImage` flag in update endpoint
- ✅ Cursor pagination for listing gifticons
- ✅ Visibility rules: Only `published` gifticons with valid time window are visible to users
- ✅ No view tracking (simpler than POCA Events)

**Gifticon Entity:**
- Fields: `title`, `slug` (unique, nullable), `summary`, `content` (HTML from rich text editor), `imageUrl`, `status` (draft/published/archived), `startsAt`, `endsAt`, `amount` (integer, points required to redeem)
- No relationships (standalone table)

**Database Schema:**
- ✅ Migration `1766395000000-create-gifticons-system.ts`:
  - Creates `gifticons` table with status enum
  - Creates `amount` column (integer, default: 0)
- ✅ Migration `1766398103142-add-amount-to-gifticons.ts`:
  - Adds `amount` column to `gifticons` table

**Key Differences from POCA Events:**
- ❌ No view tracking (no `view_count`, no `poca_event_views` table)
- ❌ No banners system (only single `image_url`)
- ✅ `amount` field for points redemption
- ✅ `content` is HTML from rich text editor (can contain embedded images)

---

### 33. POCA Posts System

**Location:** `src/modules/post/`

**User APIs (`/api/posts`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/posts` | List published posts (cursor pagination) | ❌ |
| `GET` | `/api/posts/:id` | Get post detail (tracks view) | ❌ |
| `GET` | `/api/posts/:id/comments` | List comments for post | ❌ |
| `GET` | `/api/post-categories` | List post categories | ❌ |
| `POST` | `/api/posts` | Create post (requires approval) | ✅ |
| `PUT` | `/api/posts/:id` | Update own post (within 1 hour) | ✅ |
| `DELETE` | `/api/posts/:id` | Soft delete own post (within 1 hour) | ✅ |
| `POST` | `/api/posts/:id/react` | React to post (like/dislike) | ✅ |
| `POST` | `/api/posts/:id/comments` | Add comment to post | ✅ |
| `DELETE` | `/api/posts/comments/:commentId` | Soft delete own comment | ✅ |

**Admin APIs (`/admin/posts`):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/admin/posts` | Create post | ✅ |
| `GET` | `/admin/posts` | List all posts (cursor pagination) | ✅ |
| `GET` | `/admin/posts/:id` | Get post detail | ✅ |
| `PUT` | `/admin/posts/:id` | Update post (full permissions) | ✅ |
| `DELETE` | `/admin/posts/:id` | Soft delete post | ✅ |
| `POST` | `/admin/post-categories` | Create category | ✅ |
| `GET` | `/admin/post-categories` | List categories | ✅ |
| `GET` | `/admin/post-categories/:id` | Get category | ✅ |
| `PUT` | `/admin/post-categories/:id` | Update category | ✅ |
| `DELETE` | `/admin/post-categories/:id` | Soft delete category | ✅ |
| `PUT` | `/admin/post-categories/restore/:id` | Restore category | ✅ |

**Features:**
- ✅ Post CRUD with permission checks
- ✅ Post categories management (CRUD with soft delete and restore)
- ✅ Status workflow: `isPublished: false` (default) → `true` (approved by admin)
- ✅ Posts can be created by users or admins (distinguished by `userId` and `adminId`)
- ✅ User posts: Can create, edit, and soft delete within 1 hour of creation
- ✅ User posts: Cannot restore deleted posts
- ✅ Admin posts: Full update permissions (no time limit, can change `isPublished`)
- ✅ Thumbnail upload: Form-data with `thumbnail` field (single file, max 20MB)
- ✅ Rich text content: HTML content from editor
- ✅ Reaction system (like/dislike) with unique constraint per user
- ✅ Comment system with nested replies support
- ✅ Top-level comments only by default (filter by `parentCommentId` for replies)
- ✅ Soft delete for comments (hard delete for reactions)
- ✅ Child comments not loaded if parent comment is deleted
- ✅ View tracking: Increments view count and creates `PostView` records
- ✅ Cursor pagination for listing posts and comments
- ✅ Filter by category, search by title
- ✅ Sort by published date, pinned posts first
- ✅ Dynamic counting: `likeCount`, `dislikeCount`, `commentCount` calculated via raw SQL subqueries
- ✅ `commentCount` includes deleted comments (for statistics)
- ✅ User comment tracking: Saves to `user_comments` table for statistics
- ✅ No `like_count` columns (all counts computed dynamically)

**Post Entity:**
- Fields: `userId` (nullable), `adminId` (nullable), `categoryId`, `title`, `content`, `thumbnailUrl`, `isPinned`, `isPublished` (default: false), `publishedAt`
- Relationships: `user`, `admin`, `category`, `comments[]`, `reactions[]`, `views[]`
- Computed properties: `likeCount`, `dislikeCount`, `commentCount`, `viewCount` (loaded via raw SQL subqueries)

**Post Category Entity:**
- Fields: `name`, `description`, `deletedAt`
- Soft delete support with restore functionality

**Post Comment Entity:**
- Fields: `postId`, `userId`, `parentCommentId` (nullable, for replies), `content`
- Relationships: `post`, `user`, `parentComment`, `replies[]`, `images[]`
- Supports nested comments (replies to comments)
- No `like_count` field (removed)

**Post Reaction Entity:**
- Fields: `postId`, `userId`, `reactionType` (like/dislike)
- Unique constraint: One reaction per user per post
- Hard delete (no soft delete)

**Post View Entity:**
- Fields: `postId`, `userId` (nullable), `ipAddress`, `userAgent` (nullable)
- Tracks post views for analytics

**Database Schema:**
- ✅ Migration `1765620000000-create-post-system.ts`:
  - Creates `posts` table
  - Creates `post_categories` table
  - Creates `post_comments` table
  - Creates `post_comment_images` table
  - Creates `post_reactions` table
  - Creates `post_views` table
- ✅ Migration `1766479250958-drop-post-user-fk.ts`:
  - Modifies `posts` table to support both user and admin creators
  - Drops `created_by_admin` column
  - Adds `admin_id` column (nullable)
  - Updates foreign keys to allow nullable `user_id` and `admin_id`
- ✅ Migration `1766479300000-remove-like-count-from-posts-and-comments.ts`:
  - Removes `like_count` column from `posts` table
  - Removes `like_count` column from `post_comments` table

**Counting System:**
- ✅ `likeCount` and `dislikeCount`: Calculated via raw SQL subqueries counting `post_reactions`
- ✅ `commentCount`: Calculated via raw SQL subquery counting ALL comments (including deleted)
- ✅ Counts mapped from raw data to entity properties using `getRawAndEntities()`
- ✅ Used in both `findByIdWithAggregates` and `findPublished` methods

**Comment Loading Rules:**
- ✅ Top-level comments: `parentCommentId IS NULL`
- ✅ Child comments: Only loaded if parent comment exists and is not deleted
- ✅ If parent comment is deleted, child comments are not retrieved

**User Comment Tracking:**
- ✅ When user adds a comment, entry is saved to `user_comments` table
- ✅ Uses polymorphic association: `commentType: CommentType.POST_COMMENT`, `commentId: comment.id`
- ✅ Used for future statistics

---
