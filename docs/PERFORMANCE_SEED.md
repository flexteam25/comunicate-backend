# Performance Dummy Data Seeder

Script seeder riêng để tạo **dummy data** phục vụ performance test trên DB riêng (cùng connection, khác database).

## Kết quả sau khi chạy (mặc định)

| Bảng | Số bản ghi |
|------|------------|
| `users` | **5,000** |
| `user_profiles` | **5,000** |
| `user_roles` | **5,000** |
| `posts` | **25,000** |
| `site_reviews` | **25,000** |
| `post_comments` | **100,000** |
| `site_review_comments` | **50,000** |
| `attendances` | **150,000** (30 ngày × 5,000 user) |
| `attendance_statistics` | **150,000** |

**Tổng cộng:** ~560,000 bản ghi.

## Yêu cầu trước khi chạy

1. **DB đích** đã được tạo và đã chạy migration (cấu trúc bảng giống DB chính).
2. Trong DB đích đã có:
   - **Role** tên `user` (chạy AuthUserSeeder trước nếu cần).
   - Ít nhất **1 PostCategory**.
   - Ít nhất **1 Site** (và SiteCategory, Tier nếu bảng sites cần).
3. Dùng DB riêng cho perf test: set biến môi trường `DB_DATABASE=poca_db_perf` (và tạo database `poca_db_perf` trước).

## Cách chạy

```bash
# Dùng DB mặc định (.env)
npm run seeder run --file performance-dummy.seeder

# Dùng DB riêng cho perf test
DB_DATABASE=poca_db_perf npm run seeder run --file performance-dummy.seeder
```

Hoặc thêm script vào `package.json`:

```json
"seeder:perf": "npm run seeder run --file performance-dummy.seeder"
```

Sau đó:

```bash
DB_DATABASE=poca_db_perf npm run seeder:perf
```

## Thay đổi số lượng (config)

Trong file `src/seeders/performance-dummy.seeder.ts`, sửa object `CONFIG`:

- `USER_COUNT`: số user (mặc định 5000).
- `POST_COUNT`: số post (mặc định 25000).
- `SITE_REVIEW_COUNT`: số site review (mặc định 25000).
- `POST_COMMENT_COUNT`: số comment bài viết (mặc định 100000).
- `SITE_REVIEW_COMMENT_COUNT`: số comment review site (mặc định 50000).
- `ATTENDANCE_DAYS`: số ngày điểm danh gần đây cho mỗi user (mặc định 30).

## Lưu ý

- Seeder **không** tạo Role, PostCategory, Site. Cần có sẵn trong DB (migration + seed cơ bản hoặc copy từ DB chính).
- Email user: dạng `perf-{n}-{timestamp}@perf.test`. Password: `password123`.
- Post slug: dạng `p-{index}-{random}` (đảm bảo unique, độ dài ≤ 20).
- Attendances / attendance_statistics dùng `orIgnore()` để tránh lỗi duplicate khi chạy lại.
