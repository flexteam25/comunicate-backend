# POCA.GG - Database Schema Documentation

## Database Schema - TABLES TO CHECK

### ✅ Admin System

#### `admins` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- email: varchar(255) (unique)
- password_hash: varchar(255)
- display_name: varchar(100)
- avatar_url: varchar(500) (nullable)
- is_active: boolean (default: true)
- is_super_admin: boolean (default: false)
- last_login_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `roles` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `name`: varchar(50) (unique)
- `description`: text
- `type`: varchar(20) (default: 'user') - enum: 'user' | 'admin'
- `created_at`: timestamptz
- `updated_at`: timestamptz
- `deleted_at`: timestamptz

#### `permissions` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `name`: varchar(100) (unique)
- `description`: text
- `type`: varchar(20) (default: 'user') - enum: 'user' | 'admin'
- `created_at`: timestamptz
- `updated_at`: timestamptz
- `deleted_at`: timestamptz

#### `admin_permissions` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- admin_id: uuid (FK -> admins.id)
- permission_id: uuid (FK -> permissions.id)
- created_at: timestamptz
```

#### `admin_roles` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- admin_id: uuid (FK -> admins.id)
- role_id: uuid (FK -> roles.id)
- created_at: timestamptz
```

#### `admin_tokens` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- admin_id: uuid (FK -> admins.id)
- token_id: varchar(255) (unique)
- refresh_token_hash: varchar(255)
- device_info: varchar(255)
- ip_address: varchar(45)
- expires_at: timestamptz
- revoked_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

#### `admin_old_passwords` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- admin_id: uuid (FK -> admins.id)
- password_hash: varchar(255)
- type: varchar(20) (default: 'change') - enum: 'change' | 'forgot'
- created_at: timestamptz
```

---

### ✅ User System

#### `users` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `email`: varchar(255) (unique)
- `password_hash`: varchar(255)
- `display_name`: varchar(100)
- `avatar_url`: varchar(500)
- `is_active`: boolean (default: true)
- `last_login_at`: timestamptz
- `created_at`: timestamptz
- `updated_at`: timestamptz
- `deleted_at`: timestamptz

#### `user_profiles` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id, unique)
- bio: text
- phone: varchar(20)
- birth_date: date
- gender: varchar(10)
- created_at: timestamptz
- updated_at: timestamptz
```

#### `badges` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `name`: varchar(100) (unique)
- `description`: text
- `icon_url`: varchar(500)
- `badge_type`: varchar(20) (default: 'user') - enum: 'user' | 'site'
- `created_at`: timestamptz
- `updated_at`: timestamptz
- `deleted_at`: timestamptz

#### `user_favorite_sites` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- site_id: uuid (FK -> sites.id)
- created_at: timestamptz
- UNIQUE(user_id, site_id)
```

#### `user_posts` ❌ **NOT EXISTS** (For faster data retrieval)
**Suggested structure (if separate table needed for tracking):**
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- post_id: uuid (FK -> posts.id)
- created_at: timestamptz
- updated_at: timestamptz
```

#### `user_comments` ❌ **NOT EXISTS** (For faster data retrieval - polymorphic association)
**Suggested structure:**
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- comment_type: varchar(50) - enum: 'post_comment' | 'site_review_comment' | 'scam_report_comment'
- comment_id: uuid - references id of the comment based on comment_type
- created_at: timestamptz
- updated_at: timestamptz
```

#### `user_old_passwords` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `user_id`: uuid (FK -> users.id)
- `password_hash`: varchar(255)
- `type`: varchar(20) (default: 'change') - enum: 'change' | 'forgot'
- `created_at`: timestamptz

#### `user_permissions` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `user_id`: uuid (FK -> users.id)
- `permission_id`: uuid (FK -> permissions.id)
- `created_at`: timestamptz

#### `user_roles` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `user_id`: uuid (FK -> users.id)
- `role_id`: uuid (FK -> roles.id)
- `created_at`: timestamptz

#### `user_tokens` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `user_id`: uuid (FK -> users.id)
- `token_id`: varchar(255) (unique)
- `refresh_token_hash`: varchar(255)
- `device_info`: varchar(255)
- `ip_address`: varchar(45)
- `expires_at`: timestamptz
- `revoked_at`: timestamptz
- `created_at`: timestamptz
- `updated_at`: timestamptz

#### `user_badges` ✅ **EXISTS**
**Columns:**
- `id`: uuid (PK)
- `user_id`: uuid (FK -> users.id)
- `badge_id`: uuid (FK -> badges.id)
- `earned_at`: timestamptz

---

### ✅ Post System

#### `posts` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- category_id: uuid (FK -> post_categories.id)
- title: varchar(255)
- content: text
- like_count: integer (default: 0)
- is_pinned: boolean (default: false)
- is_published: boolean (default: false)
- published_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `post_categories` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- name: varchar(50) (unique)
- description: text
- created_at: timestamptz
- updated_at: timestamptz
```

#### `post_comments` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- post_id: uuid (FK -> posts.id)
- user_id: uuid (FK -> users.id)
- parent_comment_id: uuid (FK -> post_comments.id, nullable) - for nested comments
- content: text
- like_count: integer (default: 0)
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `post_comment_images` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- comment_id: uuid (FK -> post_comments.id)
- image_url: varchar(500)
- order: integer (default: 0)
- created_at: timestamptz
```

#### `post_reactions` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- post_id: uuid (FK -> posts.id)
- user_id: uuid (FK -> users.id)
- reaction_type: varchar(10) - enum: 'like' | 'dislike'
- created_at: timestamptz
- updated_at: timestamptz
- UNIQUE(post_id, user_id)
```

#### `post_views` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- post_id: uuid (FK -> posts.id)
- user_id: uuid (FK -> users.id, nullable) - nullable for anonymous views
- ip_address: varchar(45)
- created_at: timestamptz
```

---

### ✅ Scam Report System

#### `scam_reports` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- site_id: uuid (FK -> sites.id, nullable)
- title: varchar(255)
- description: text
- amount: decimal(15, 2)
- status: varchar(20) (default: 'pending') - enum: 'pending' | 'published' | 'rejected'
- admin_id: uuid (FK -> admins.id, nullable) - admin who reviewed
- reviewed_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `scam_report_comments` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- scam_report_id: uuid (FK -> scam_reports.id)
- user_id: uuid (FK -> users.id)
- parent_comment_id: uuid (FK -> scam_report_comments.id, nullable)
- content: text
- like_count: integer (default: 0)
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `scam_report_comment_images` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- comment_id: uuid (FK -> scam_report_comments.id)
- image_url: varchar(500)
- order: integer (default: 0)
- created_at: timestamptz
```

#### `scam_report_reactions` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- scam_report_id: uuid (FK -> scam_reports.id)
- user_id: uuid (FK -> users.id)
- reaction_type: varchar(10) - enum: 'like' | 'dislike'
- created_at: timestamptz
- updated_at: timestamptz
- UNIQUE(scam_report_id, user_id)
```

#### `scam_report_site` ❌ **NOT EXISTS** (Relation table - Many-to-Many)
**Suggested structure:**
```sql
- id: uuid (PK)
- scam_report_id: uuid (FK -> scam_reports.id)
- site_id: uuid (FK -> sites.id)
- created_at: timestamptz
- UNIQUE(scam_report_id, site_id)
```

---

### ✅ Site System

#### `sites` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- name: varchar(255)
- category_id: uuid (FK -> site_categories.id)
- logo_url: varchar(500)
- main_image_url: varchar(500)
- tier_id: uuid (FK -> tiers.id)
- permanent_url: varchar(500) - nullable
- status: varchar(20) (default: 'unverified') - enum: 'unverified' | 'verified' | 'monitored'
- description: text
- review_count: integer (default: 0)
- average_rating: decimal(3, 2) (default: 0)
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `site_managers` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id)
- user_id: uuid (FK -> users.id)
- role: varchar(50) (default: 'manager') - enum: 'manager' | 'owner'
- is_active: boolean (default: true)
- created_at: timestamptz
- updated_at: timestamptz
- UNIQUE(site_id, user_id)
```

#### `site_categories` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- name: varchar(50) (unique)
- description: text
- created_at: timestamptz
- updated_at: timestamptz
```

#### `tiers` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- name: varchar(10) (unique)
- description: text
- order: integer (default: 0) - for tier sorting
- color: varchar(20) (nullable) - display color for tier
- created_at: timestamptz
- updated_at: timestamptz
```

#### `site_domains` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id)
- domain: varchar(255) (unique)
- is_active: boolean (default: false)
- is_current: boolean (default: false) - current domain
- created_at: timestamptz
- updated_at: timestamptz
```

#### `site_badges` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id)
- badge_id: uuid (FK -> badges.id)
- created_at: timestamptz
- UNIQUE(site_id, badge_id)
```

#### `site_rank_metrics` ❌ **NOT EXISTS** (Statistic table)
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id, unique)
- review_count: integer (default: 0)
- experience_years: integer (default: 0)
- total_views: integer (default: 0)
- total_favorites: integer (default: 0)
- updated_at: timestamptz
```

#### `site_reviews` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id)
- user_id: uuid (FK -> users.id)
- rating: integer (check: 1-5)
- title: varchar(255)
- content: text
- like_count: integer (default: 0)
- is_published: boolean (default: true)
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
- UNIQUE(site_id, user_id) - one review per user per site
```

#### `site_review_comments` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- review_id: uuid (FK -> site_reviews.id)
- user_id: uuid (FK -> users.id)
- parent_comment_id: uuid (FK -> site_review_comments.id, nullable) - for nested comments
- content: text
- like_count: integer (default: 0)
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `site_review_reactions` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- review_id: uuid (FK -> site_reviews.id)
- user_id: uuid (FK -> users.id)
- reaction_type: varchar(10) - enum: 'like' | 'dislike'
- created_at: timestamptz
- updated_at: timestamptz
- UNIQUE(review_id, user_id)
```

#### `site_views` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id)
- user_id: uuid (FK -> users.id, nullable) - nullable for anonymous views
- ip_address: varchar(45)
- created_at: timestamptz
```

#### `site_events` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id)
- title: varchar(255)
- description: text
- start_date: timestamptz
- end_date: timestamptz
- is_active: boolean (default: true)
- created_at: timestamptz
- updated_at: timestamptz
- deleted_at: timestamptz
```

#### `site_event_banners` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- event_id: uuid (FK -> site_events.id)
- image_url: varchar(500)
- link_url: varchar(500)
- order: integer (default: 0)
- is_active: boolean (default: true)
- created_at: timestamptz
```

#### `site_event_views` ❌ **NOT EXISTS**
**Suggested structure:**
```sql
- id: uuid (PK)
- event_id: uuid (FK -> site_events.id)
- user_id: uuid (FK -> users.id, nullable) - nullable for anonymous views
- ip_address: varchar(45)
- created_at: timestamptz
```

#### `site_manager_applications` ❌ **NOT EXISTS** (Manage site request)
**Suggested structure:**
```sql
- id: uuid (PK)
- site_id: uuid (FK -> sites.id)
- user_id: uuid (FK -> users.id)
- message: text
- status: varchar(20) (default: 'pending') - enum: 'pending' | 'approved' | 'rejected'
- admin_id: uuid (FK -> admins.id, nullable) - admin who reviewed
- reviewed_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

#### `site_applications` ❌ **NOT EXISTS** (New site request)
**Suggested structure:**
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- site_name: varchar(255)
- site_url: varchar(500)
- category_id: uuid (FK -> site_categories.id)
- description: text
- status: varchar(20) (default: 'pending') - enum: 'pending' | 'approved' | 'rejected'
- admin_id: uuid (FK -> admins.id, nullable) - admin who reviewed
- reviewed_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

---

## Summary

### ✅ Existing Tables (9 tables):
1. `users`
2. `roles`
3. `permissions`
4. `badges`
5. `user_roles`
6. `user_permissions`
7. `user_badges`
8. `user_old_passwords`
9. `user_tokens`

### ❌ Missing Tables (need to create - 46 tables):
1. `admins`
2. `admin_permissions`
3. `admin_roles`
4. `admin_tokens`
5. `admin_old_passwords`
6. `user_profiles`
7. `user_favorite_sites`
8. `user_posts` (may not be needed if using `posts.user_id`)
9. `user_comments` (may not be needed if using `post_comments.user_id`)
10. `posts`
11. `post_categories`
12. `post_comments`
13. `post_comment_images`
14. `post_reactions`
15. `post_views`
16. `scam_reports`
17. `scam_report_comments`
18. `scam_report_comment_images`
19. `scam_report_reactions`
20. `scam_report_site`
21. `sites`
22. `site_managers`
23. `site_categories`
24. `tiers`
25. `site_domains`
26. `site_badges`
27. `site_rank_metrics`
28. `site_reviews`
29. `site_review_comments`
30. `site_review_reactions`
31. `site_views`
32. `site_events`
33. `site_event_banners`
34. `site_event_views`
35. `site_manager_applications`
36. `site_applications`

**Total: 55 tables (9 existing + 46 missing)**
