# Kế hoạch: User Site Request System

## Phân tích yêu cầu

### Khác biệt so với Partner Site Creation:
- **Partner tạo site** → Tự động trở thành manager → Site status = `UNVERIFIED`
- **User request site** → **KHÔNG** trở thành manager → Admin duyệt → Nếu approve: Tạo site + Cộng điểm cho user

---

## Database Schema

### 1. Tạo table `site_requests`:

```sql
CREATE TABLE site_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(50) UNIQUE NULLABLE,
  category_id UUID NOT NULL REFERENCES site_categories(id),
  logo_url VARCHAR(500) NULLABLE,
  main_image_url VARCHAR(500) NULLABLE,
  site_image_url VARCHAR(500) NULLABLE,
  tier_id UUID NULLABLE REFERENCES tiers(id),
  permanent_url VARCHAR(500) NULLABLE,
  description TEXT NULLABLE,
  first_charge INTEGER NULLABLE,
  recharge INTEGER NULLABLE,
  experience INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  site_id UUID NULLABLE REFERENCES sites(id) ON DELETE SET NULL,
  admin_id UUID NULLABLE REFERENCES admins(id) ON DELETE SET NULL,
  rejection_reason TEXT NULLABLE,
  ip_address VARCHAR(45) NULLABLE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ NULLABLE
);
```

**Fields:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to users, NOT NULL) - User gửi request
- `name` (varchar 255, NOT NULL)
- `slug` (varchar 50, unique, nullable) - Admin có thể set sau
- `category_id` (uuid, FK, NOT NULL)
- `logo_url` (varchar 500, nullable)
- `main_image_url` (varchar 500, nullable)
- `site_image_url` (varchar 500, nullable)
- `tier_id` (uuid, FK, nullable)
- `permanent_url` (varchar 500, nullable)
- `description` (text, nullable)
- `first_charge` (integer, nullable)
- `recharge` (integer, nullable)
- `experience` (integer, default 0)
- `status` (enum: 'pending', 'approved', 'rejected', 'cancelled', NOT NULL, default 'pending')
- `site_id` (uuid, FK to sites, nullable) - Link đến site nếu được approve
- `admin_id` (uuid, FK to admins, nullable) - Admin duyệt/reject
- `rejection_reason` (text, nullable) - Lý do reject
- `ip_address` (varchar 45, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `deleted_at` (timestamptz, nullable)

### 2. Indexes:

- `IDX_site_requests_user_id` on `user_id`
- `IDX_site_requests_status` on `status`
- `IDX_site_requests_site_id` on `site_id`
- `IDX_site_requests_admin_id` on `admin_id`
- `IDX_site_requests_created_at` on `created_at` (for sorting)

### 3. Enum Type:

```sql
CREATE TYPE site_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
```

---

## API Endpoints

### User APIs:

#### 1. `POST /api/site-requests` - User submit site request
- **Auth:** JWT required
- **Body:** Site data (tương tự create site, nhưng không có slug)
- **Response:** Site request với status = 'pending'
- **Real-time:** Gửi event `site-request:created` đến admin room

**Request Body:**
```json
{
  "name": "string (required)",
  "categoryId": "uuid (required)",
  "logo": "file (optional)",
  "mainImage": "file (optional)",
  "siteImage": "file (optional)",
  "tierId": "uuid (optional)",
  "permanentUrl": "string (optional)",
  "description": "string (optional)",
  "firstCharge": "number (optional)",
  "recharge": "number (optional)",
  "experience": "number (optional, default 0)"
}
```

#### 2. `GET /api/site-requests` - User xem list requests của mình
- **Auth:** JWT required
- **Query:** `status?`, `cursor?`, `limit?` (max 50)
- **Response:** List site requests của user với cursor pagination
- **Sort:** Default `created_at DESC`

**Query Parameters:**
- `status`: 'pending' | 'approved' | 'rejected' | 'cancelled' (optional)
- `cursor`: string (optional, for pagination)
- `limit`: number (optional, default 20, max 50)

#### 3. `GET /api/site-requests/:id` - User xem chi tiết request
- **Auth:** JWT required
- **Response:** Site request detail (chỉ request của chính user đó)

#### 4. `POST /api/site-requests/:id/cancel` - User cancel request
- **Auth:** JWT required
- **Logic:**
  - Chỉ có thể cancel request đang pending
  - Update status = 'cancelled' (hoặc set deleted_at)
  - Sau khi cancel, không thể active lại
- **Response:** Site request với status = 'cancelled'

### Admin APIs:

#### 1. `GET /admin/site-requests` - Admin list tất cả requests
- **Auth:** Admin JWT + permission `site-request.read`
- **Query:** `status?`, `userName?`, `startDate?`, `endDate?`, `cursor?`, `limit?` (max 50)
- **Response:** List site requests với user info
- **Sort:** Default `created_at DESC`

**Query Parameters:**
- `status`: 'pending' | 'approved' | 'rejected' | 'cancelled' (optional)
- `userName`: string (optional, search by user displayName or email)
- `startDate`: ISO8601 date string (optional, filter by created_at >= startDate)
- `endDate`: ISO8601 date string (optional, filter by created_at <= endDate)
- `cursor`: string (optional, for pagination)
- `limit`: number (optional, default 20, max 50)

#### 2. `GET /admin/site-requests/:id` - Admin xem chi tiết request
- **Auth:** Admin JWT + permission `site-request.read`
- **Response:** Site request detail với user info

#### 3. `POST /admin/site-requests/:id/approve` - Admin approve request
- **Auth:** Admin JWT + permission `site-request.approve`
- **Body:** `{ slug?: string, points: number, status?: string, tierId?: string, categoryId?: string }`
- **Logic:**
  - Validate request status = 'pending'
  - Nếu admin không gửi slug: Generate slug từ site name (unique)
  - Nếu admin gửi slug: Validate unique slug
  - Tạo site từ request data (admin có thể override status, tierId, categoryId)
  - Move files từ request folder sang site folder (nếu có)
  - Update `site_requests.status = 'approved'`, `site_id = newSite.id`, `admin_id = currentAdmin.id`
  - Cộng điểm cho user (admin bắt buộc phải set, min 0, tạo point transaction)
  - Real-time: Gửi `site-request:approved` đến user room và admin room
  - Real-time: Gửi `point:updated` đến user room
- **Response:** Site request object với full site object đã tạo

**Request Body:**
```json
{
  "slug": "string (optional, nếu không gửi sẽ generate từ name, phải unique)",
  "points": "number (required, min 0)",
  "status": "string (optional, 'verified' | 'unverified' | 'monitored', default 'verified')",
  "tierId": "uuid (optional, override tier)",
  "categoryId": "uuid (optional, override category)"
}
```

#### 4. `POST /admin/site-requests/:id/reject` - Admin reject request
- **Auth:** Admin JWT + permission `site-request.reject`
- **Body:** `{ rejectionReason?: string }`
- **Logic:**
  - Update `site_requests.status = 'rejected'`, `admin_id = currentAdmin.id`, `rejection_reason`
  - Real-time: Gửi `site-request:rejected` đến user room và admin room

**Request Body:**
```json
{
  "rejectionReason": "string (optional)"
}
```

---

## Point System

### Khi approve site request:
- Admin **bắt buộc** phải set điểm (min 0, không có default)
- Tạo `PointTransaction` với:
  - `category = 'site_request_reward'`
  - `amount = points` (positive, từ admin input)
  - `balanceAfter = currentPoints + points`
  - `description = 'Site request approved: {siteName}'` hoặc `'Site request approved (ID: {requestId}): {siteName}'`

---

## Real-time Events

### 1. `site-request:created` (Admin room)
- **Trigger:** User tạo site request
- **Data:** Site request object với user info
- **Target:** Admin room

### 2. `site-request:approved` (User room + Admin room)
- **Trigger:** Admin approve site request
- **Data:** Site request object + created site object + points awarded
- **Target:** 
  - User room (`user.{userId}`)
  - Admin room

### 3. `site-request:rejected` (User room + Admin room)
- **Trigger:** Admin reject site request
- **Data:** Site request object + rejection reason
- **Target:**
  - User room (`user.{userId}`)
  - Admin room

### 4. `point:updated` (User room)
- **Trigger:** Khi approve và cộng điểm
- **Data:** Point update info
- **Target:** User room (`user.{userId}`)

---

## Use Cases

### 1. `CreateSiteRequestUseCase`
- Validate data (tương tự partner site creation)
- Check duplicate name (case-insensitive):
  - Check với sites đã tồn tại (không bao gồm soft-deleted)
  - Check với requests đang pending (nếu có thì reject)
- Save site request với status = 'pending'
- Save IP address
- Upload files (logo, mainImage, siteImage) vào request folder
- Publish `site-request:created` event

### 2. `ListSiteRequestsUseCase` (User)
- Filter by `user_id` (current user), `status`
- Cursor pagination
- Return only user's own requests

### 3. `ListSiteRequestsUseCase` (Admin)
- Filter by `status`, `userId`
- Cursor pagination
- Include user info in response

### 4. `GetSiteRequestUseCase`
- Get by ID với relations
- User version: Only return if belongs to current user
- Admin version: Return with user info

### 5. `ApproveSiteRequestUseCase`
- Validate request status = 'pending'
- Validate points từ admin (required, min 0)
- Generate slug từ name nếu admin không gửi, hoặc validate slug uniqueness nếu admin gửi
- Create site từ request data:
  - Admin có thể override: status (default VERIFIED), tierId, categoryId
  - Move files từ request folder sang site folder
  - Copy các fields từ request: name, logoUrl, mainImageUrl, siteImageUrl, permanentUrl, description, firstCharge, recharge, experience
- Update request status = 'approved', link to site, save admin_id
- Add points to user (từ admin input)
- Create point transaction với category 'site_request_reward'
- Publish `site-request:approved` và `point:updated` events

### 6. `CancelSiteRequestUseCase` (User)
- Validate request status = 'pending'
- Validate request belongs to current user
- Update request status = 'cancelled' (hoặc set deleted_at)
- Không gửi real-time event (chỉ user action)

### 7. `RejectSiteRequestUseCase`
- Validate request status = 'pending'
- Update request status = 'rejected'
- Save rejection reason
- Save admin_id
- Publish `site-request:rejected` event

---

## Migration

### `1768100000000-create-site-requests-table.ts`

**Up:**
1. Create enum type `site_request_status`
2. Create table `site_requests` với tất cả columns
3. Create foreign keys
4. Create indexes
5. Add comments for documentation

**Down:**
1. Drop indexes
2. Drop foreign keys
3. Drop table
4. Drop enum type

---

## Module Structure

```
src/modules/site-request/
├── domain/
│   └── entities/
│       └── site-request.entity.ts
├── infrastructure/
│   └── persistence/
│       ├── repositories/
│       │   ├── site-request.repository.ts (interface)
│       │   └── typeorm/
│       │       └── site-request.repository.ts
│       └── site-request-persistence.module.ts
├── application/
│   └── handlers/
│       ├── user/
│       │   ├── create-site-request.use-case.ts
│       │   ├── list-site-requests.use-case.ts
│       │   ├── get-site-request.use-case.ts
│       │   └── cancel-site-request.use-case.ts
│       └── admin/
│           ├── list-site-requests.use-case.ts
│           ├── get-site-request.use-case.ts
│           ├── approve-site-request.use-case.ts
│           └── reject-site-request.use-case.ts
├── interface/
│   └── rest/
│       ├── dto/
│       │   ├── create-site-request.dto.ts
│       │   ├── site-request-response.dto.ts
│       │   ├── approve-site-request.dto.ts
│       │   ├── reject-site-request.dto.ts
│       │   └── list-site-requests-query.dto.ts (user & admin)
│       ├── user/
│       │   └── site-request.controller.ts
│       └── admin/
│           └── site-request.controller.ts
└── site-request.module.ts
```

---

## Permissions

### Thêm permissions mới:
- `site-request.read` - Xem site requests
- `site-request.approve` - Approve site requests
- `site-request.reject` - Reject site requests

### Seeder:
- Thêm 3 permissions trên vào seeder
- Assign permissions cho admin roles (hoặc super admin only)

---

## Redis Channels & Socket Events

### Redis Channels:
- `SITE_REQUEST_CREATED`
- `SITE_REQUEST_APPROVED`
- `SITE_REQUEST_REJECTED`

### Socket Events:
- `site-request:created`
- `site-request:approved`
- `site-request:rejected`

### Socket Rooms:
- `admin` - Cho admin events
- `user.{userId}` - Cho user-specific events

---

## Questions đã xác nhận

### 1. Điểm thưởng ✅
- **Quyết định:** Không có điểm mặc định, admin **bắt buộc** phải set điểm khi approve
- **Min:** 0 điểm
- **Max:** Không giới hạn (hoặc theo config)
- **Reject:** Không trừ điểm khi reject

### 2. Site status khi approve ✅
- **Quyết định:** Admin có thể quyết định status khi approve (VERIFIED, UNVERIFIED, MONITORED)
- **Default:** VERIFIED (nếu admin không set)

### 3. Slug ✅
- **Quyết định:** Admin có thể gửi slug khi approve, nếu không gửi thì **generate từ site name**
- **Validation:** Slug bắt buộc unique (check với sites và requests đã approved)
- **Generate logic:** Tương tự migration `AddSlugToSites` - lowercase, alphanumeric, hyphens, max 50 chars

### 4. File uploads ✅
- **Quyết định:** User có thể upload logo/images khi request, files sẽ được **move/copy sang site** khi approve
- **Logic:** Tương tự partner site creation
- **File handling:** Khi approve, move files từ request sang site folder

### 5. Cancel request ✅
- **Quyết định:** User **có thể cancel** request đang pending
- **Logic:** 
  - Cancel = update status = 'cancelled' (hoặc set deleted_at)
  - Sau khi cancel, **không thể active lại**
  - User không thể edit request, chỉ có thể cancel và tạo request mới

### 6. Duplicate check ✅
- **Quyết định:** 
  - Check duplicate name (case-insensitive) với:
    - Sites đã tồn tại (không bao gồm soft-deleted)
    - Requests đang pending (bắt buộc check này)
  - **Không cho phép** request mới nếu có request pending với cùng name
  - Request đã rejected có thể re-request (check lại duplicate)

### 7. User có thể request ✅
- **Quyết định:** User có thể request (không giới hạn số lượng)

### 8. Multiple requests ✅
- **Quyết định:** User có thể request nhiều site cùng lúc (không giới hạn)

### 9. Re-request after rejection ✅
- **Quyết định:** Sau khi reject, user có thể tạo request mới với cùng name, nhưng phải check:
  - Không có request pending nào với cùng name
  - Không có site đã tồn tại với cùng name

### 10. Point transaction ✅
- **Category:** `site_request_reward`
- **Description:** `Site request approved: {siteName}` hoặc `Site request approved (ID: {requestId}): {siteName}`

### 11. Admin override khi approve ✅
- **Quyết định:** Admin có thể override:
  - `slug` (bắt buộc - nếu không gửi thì generate từ name)
  - `status` (optional, default VERIFIED)
  - `tierId` (optional)
  - `categoryId` (optional - có thể override category)
  - `points` (bắt buộc, min 0)

### 12. Validation ✅
- **Quyết định:** Tương tự như partner tạo site
- **Bắt buộc:** `name`, `categoryId`
- **Optional:** logo, mainImage, siteImage, tierId, permanentUrl, description, firstCharge, recharge, experience
- **Validation rules:** Giống partner site creation (max length, number ranges, etc.)

### 13. Notification ✅
- **Quyết định:** Chỉ real-time events, **không gửi email**

### 14. Tier assignment ✅
- **Quyết định:** Giống site creation hiện tại (optional, có thể null)

### 15. Response format ✅
- **Quyết định:** Theo đề xuất
  - Approve response: Include full site object
  - List response: Include `siteId` và có thể include `site` object

### 16. Admin list filtering ✅
- **Quyết định:** Admin list có filter:
  - `userName` (search by user displayName or email)
  - `status` (pending, approved, rejected, cancelled)
  - `date range` (startDate, endDate - filter by created_at)
  - `cursor`, `limit` (pagination)
- **Sort:** Default `created_at DESC` (mới nhất trước)

---

## Implementation Steps

### Phase 1: Database & Entity
1. ✅ Create migration `1768100000000-create-site-requests-table.ts`
2. ✅ Create `SiteRequest` entity
3. ✅ Create repository interface và implementation
4. ✅ Create persistence module

### Phase 2: Use Cases
1. ✅ `CreateSiteRequestUseCase` (user)
2. ✅ `ListSiteRequestsUseCase` (user)
3. ✅ `ListSiteRequestsUseCase` (admin - với filter userName, status, date range)
4. ✅ `GetSiteRequestUseCase` (user & admin)
5. ✅ `CancelSiteRequestUseCase` (user)
6. ✅ `ApproveSiteRequestUseCase` (admin - với slug generation, file move, points)
7. ✅ `RejectSiteRequestUseCase` (admin)

### Phase 3: DTOs & Controllers
1. ✅ Create DTOs (create, response, approve, reject, query)
2. ✅ Create user controller
3. ✅ Create admin controller
4. ✅ Add validation

### Phase 4: Real-time Events
1. ✅ Add Redis channels
2. ✅ Add Socket events
3. ✅ Update SocketGateway subscriptions
4. ✅ Publish events in use cases

### Phase 5: Permissions
1. ✅ Add permissions to seeder
2. ✅ Update admin role permissions (nếu cần)

### Phase 6: Testing
1. ✅ Test user APIs
2. ✅ Test admin APIs
3. ✅ Test real-time events
4. ✅ Test point system

---

## Notes

- User **KHÔNG** trở thành manager khi site được approve
- Admin **bắt buộc** phải set điểm khi approve (min 0, không có default)
- Admin có thể chỉnh sửa data trước khi approve (slug, status, tierId, categoryId)
- Slug: Admin có thể gửi hoặc auto-generate từ name (unique)
- Files: Move từ request folder sang site folder khi approve
- User có thể cancel request đang pending (không thể active lại)
- Duplicate check: Check với sites và requests pending (không cho phép duplicate)
- Real-time events để notify user và admin (không gửi email)
- IP address tracking cho audit trail
- Soft delete support (deleted_at)

