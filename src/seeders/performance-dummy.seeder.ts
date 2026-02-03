/**
 * Performance Dummy Data Seeder
 *
 * Kết quả khi chạy (mặc định):
 * - users:           5,000
 * - user_profiles:   5,000
 * - user_roles:      5,000
 * - posts:          25,000
 * - site_reviews:    25,000
 * - post_comments:  100,000
 * - site_review_comments: 50,000
 * - attendances:    150,000 (30 ngày × 5,000 user)
 * - attendance_statistics: 150,000
 *
 * Yêu cầu trước khi chạy:
 * - Đã chạy migration trên DB đích.
 * - Nếu chưa có: Role 'user', PostCategory, Site → seeder sẽ tự tạo bản ghi tối thiểu.
 * - Dùng DB riêng cho perf test: set DB_DATABASE=poca_db_perf (và tạo DB + chạy migration trước).
 *
 * Chạy: npm run seeder run --file performance-dummy.seeder
 */

import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/user/domain/entities/user.entity';
import { UserProfile } from '../modules/user/domain/entities/user-profile.entity';
import { Role, RoleType } from '../modules/user/domain/entities/role.entity';
import { UserRole } from '../modules/user/domain/entities/user-role.entity';
import { PostCategory } from '../modules/post/domain/entities/post-category.entity';
import { Post } from '../modules/post/domain/entities/post.entity';
import { PostComment } from '../modules/post/domain/entities/post-comment.entity';
import { SiteCategory } from '../modules/site/domain/entities/site-category.entity';
import { Site, SiteStatus } from '../modules/site/domain/entities/site.entity';
import { SiteReview } from '../modules/site-review/domain/entities/site-review.entity';
import { SiteReviewComment } from '../modules/site-review/domain/entities/site-review-comment.entity';
import { Attendance } from '../modules/attendance/domain/entities/attendance.entity';
import { AttendanceStatistic } from '../modules/attendance/domain/entities/attendance-statistic.entity';
import { Admin } from '../modules/admin/domain/entities/admin.entity';
import { AuthUserSeeder } from './auth-user-seeder';
import { AuthAdminSeeder } from './auth-admin-seeder';

const BATCH = 500;

const CONFIG = {
  USER_COUNT: 5000,
  POST_COUNT: 25000,
  SITE_REVIEW_COUNT: 25000,
  POST_COMMENT_COUNT: 100000,
  SITE_REVIEW_COMMENT_COUNT: 50000,
  ATTENDANCE_DAYS: 30,
} as const;

export class PerformanceDummySeeder {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    console.log('\n📋 Performance Dummy Seeder – Kết quả sẽ tạo:');
    console.log('   users:              ', CONFIG.USER_COUNT.toLocaleString());
    console.log('   user_profiles:      ', CONFIG.USER_COUNT.toLocaleString());
    console.log('   user_roles:         ', CONFIG.USER_COUNT.toLocaleString());
    console.log('   posts:             ', CONFIG.POST_COUNT.toLocaleString());
    console.log('   site_reviews:       ', CONFIG.SITE_REVIEW_COUNT.toLocaleString());
    console.log('   post_comments:      ', CONFIG.POST_COMMENT_COUNT.toLocaleString());
    console.log('   site_review_comments:', CONFIG.SITE_REVIEW_COMMENT_COUNT.toLocaleString());
    console.log(
      '   attendances:        ',
      (CONFIG.USER_COUNT * CONFIG.ATTENDANCE_DAYS).toLocaleString(),
    );
    console.log(
      '   attendance_statistics:',
      (CONFIG.USER_COUNT * CONFIG.ATTENDANCE_DAYS).toLocaleString(),
    );
    console.log('');

    // Ensure at least one admin exists (re-use existing auth seeders)
    const adminRepo = this.dataSource.getRepository(Admin);
    const existingAdmin = await adminRepo.findOne({ where: {} });
    if (!existingAdmin) {
      console.log('   No admin found – running AuthUserSeeder + AuthAdminSeeder...');
      const authUserSeeder = new AuthUserSeeder(this.dataSource);
      await authUserSeeder.seed();
      const authAdminSeeder = new AuthAdminSeeder(this.dataSource);
      await authAdminSeeder.seed();
      console.log('   Seeded admin account superadmin@poca.gg (SuperAdmin@123).');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Ensure Role 'user' exists (create if missing for fresh DB)
      let userRole = await queryRunner.manager.findOne(Role, {
        where: { name: 'user' },
      });
      if (!userRole) {
        await queryRunner.startTransaction();
        userRole = queryRunner.manager.create(Role, {
          name: 'user',
          description: 'Regular user role',
          type: RoleType.USER,
        });
        await queryRunner.manager.save(Role, userRole);
        await queryRunner.commitTransaction();
        console.log('   Created Role "user" (prerequisite).');
      }

      // Ensure at least one PostCategory exists
      let [postCategory] = await queryRunner.manager.find(PostCategory, {
        take: 1,
      });
      if (!postCategory) {
        await queryRunner.startTransaction();
        postCategory = queryRunner.manager.create(PostCategory, {
          name: 'Perf Posts',
          showMain: false,
          isPointBanner: false,
          adminCreateOnly: false,
          point: 0,
        });
        await queryRunner.manager.save(PostCategory, postCategory);
        await queryRunner.commitTransaction();
        console.log('   Created PostCategory "Perf Posts" (prerequisite).');
      }

      // Ensure at least one Site exists (need SiteCategory first)
      let sites = await queryRunner.manager.find(Site, { take: 100 });
      if (sites.length === 0) {
        await queryRunner.startTransaction();
        let [siteCategory] = await queryRunner.manager.find(SiteCategory, {
          take: 1,
        });
        if (!siteCategory) {
          siteCategory = queryRunner.manager.create(SiteCategory, {
            name: 'Perf Sites',
          });
          await queryRunner.manager.save(SiteCategory, siteCategory);
        }
        // Tạo nhiều site để tăng số cặp (site, user) khả dụng cho site_reviews
        const perfSites: Site[] = [];
        const PERF_SITE_COUNT = 10;
        for (let i = 0; i < PERF_SITE_COUNT; i++) {
          const site = queryRunner.manager.create(Site, {
            name: `Perf Site ${i + 1}`,
            slug: `perf-site-${i + 1}`,
            categoryId: siteCategory.id,
            status: SiteStatus.UNVERIFIED,
          });
          perfSites.push(site);
        }
        await queryRunner.manager.save(Site, perfSites);
        await queryRunner.commitTransaction();
        sites = perfSites;
        console.log(
          `   Created SiteCategory + ${perfSites.length} Sites (prerequisite).`,
        );
      }

      const siteIds = sites.map((s) => s.id);
      const passwordHash = await bcrypt.hash('password123', 10);

      const userIds: string[] = [];

      for (let offset = 0; offset < CONFIG.USER_COUNT; offset += BATCH) {
        await queryRunner.startTransaction();
        const size = Math.min(BATCH, CONFIG.USER_COUNT - offset);
        const users = Array.from({ length: size }, (_, i) => {
          const n = offset + i + 1;
          return queryRunner.manager.create(User, {
            email: `perf-${n}-${Date.now()}@perf.test`,
            passwordHash,
            displayName: faker.person.fullName(),
            isActive: true,
          });
        });
        const saved = await queryRunner.manager.save(User, users);
        userIds.push(...saved.map((u) => u.id));
        await queryRunner.commitTransaction();
        console.log(
          `   Users ${Math.min(offset + BATCH, CONFIG.USER_COUNT).toLocaleString()}/${CONFIG.USER_COUNT.toLocaleString()}`,
        );
      }

      for (let i = 0; i < userIds.length; i += BATCH) {
        await queryRunner.startTransaction();
        const chunk = userIds.slice(i, i + BATCH).map((userId) =>
          queryRunner.manager.create(UserProfile, {
            userId,
            points: 0,
            bio: faker.lorem.sentence(),
          }),
        );
        await queryRunner.manager.save(UserProfile, chunk);
        await queryRunner.commitTransaction();
      }
      console.log('   User profiles done.');

      for (let i = 0; i < userIds.length; i += BATCH) {
        await queryRunner.startTransaction();
        const chunk = userIds
          .slice(i, i + BATCH)
          .map((userId) =>
            queryRunner.manager.create(UserRole, { userId, roleId: userRole.id }),
          );
        await queryRunner.manager.save(UserRole, chunk);
        await queryRunner.commitTransaction();
      }
      console.log('   User roles done.');

      const postIds: string[] = [];
      for (let offset = 0; offset < CONFIG.POST_COUNT; offset += BATCH) {
        await queryRunner.startTransaction();
        const size = Math.min(BATCH, CONFIG.POST_COUNT - offset);
        const posts = Array.from({ length: size }, (_, i) => {
          const idx = offset + i;
          return queryRunner.manager.create(Post, {
            userId: userIds[idx % userIds.length],
            categoryId: postCategory.id,
            title: faker.lorem.sentence().slice(0, 255),
            slug: `p-${String(offset + i).padStart(5, '0')}-${faker.string.alphanumeric(11)}`,
            content: faker.lorem.paragraphs(2),
            isPublished: true,
            publishedAt: faker.date.past({ years: 1 }),
            isPinned: false,
          });
        });
        const saved = await queryRunner.manager.save(Post, posts);
        postIds.push(...saved.map((p) => p.id));
        await queryRunner.commitTransaction();
        console.log(
          `   Posts ${Math.min(offset + BATCH, CONFIG.POST_COUNT).toLocaleString()}/${CONFIG.POST_COUNT.toLocaleString()}`,
        );
      }

      const siteReviewIds: string[] = [];
      const usedSiteUserPairs = new Set<string>();
      const maxSiteUserPairs = siteIds.length * userIds.length;
      const targetSiteReviewCount = Math.min(
        CONFIG.SITE_REVIEW_COUNT,
        maxSiteUserPairs,
      );
      if (targetSiteReviewCount < CONFIG.SITE_REVIEW_COUNT) {
        console.log(
          `   Note: reducing site_reviews from ${CONFIG.SITE_REVIEW_COUNT.toLocaleString()} to ${targetSiteReviewCount.toLocaleString()} due to unique (site,user) constraint`,
        );
      }
      let createdSiteReviews = 0;

      while (createdSiteReviews < targetSiteReviewCount) {
        await queryRunner.startTransaction();
        const remaining = targetSiteReviewCount - createdSiteReviews;
        const size = Math.min(BATCH, remaining);
        const reviews: SiteReview[] = [];

        while (reviews.length < size) {
          const siteId = faker.helpers.arrayElement(siteIds);
          const userId = faker.helpers.arrayElement(userIds);
          const key = `${siteId}-${userId}`;

          if (usedSiteUserPairs.has(key)) {
            continue;
          }

          usedSiteUserPairs.add(key);
          reviews.push(
            queryRunner.manager.create(SiteReview, {
              siteId,
              userId,
              rating: faker.number.int({ min: 1, max: 5 }),
              content: faker.lorem.paragraphs(1),
              isPublished: true,
            }),
          );
        }

        const saved = await queryRunner.manager.save(SiteReview, reviews);
        siteReviewIds.push(...saved.map((r) => r.id));
        createdSiteReviews += saved.length;
        await queryRunner.commitTransaction();

        console.log(
          `   Site reviews ${createdSiteReviews.toLocaleString()}/${targetSiteReviewCount.toLocaleString()}`,
        );
      }

      for (let offset = 0; offset < CONFIG.POST_COMMENT_COUNT; offset += BATCH) {
        await queryRunner.startTransaction();
        const size = Math.min(BATCH, CONFIG.POST_COMMENT_COUNT - offset);
        const comments = Array.from({ length: size }, (_, i) => {
          const idx = offset + i;
          return queryRunner.manager.create(PostComment, {
            postId: postIds[idx % postIds.length],
            userId: userIds[idx % userIds.length],
            content: faker.lorem.sentence(),
            hasChild: false,
          });
        });
        await queryRunner.manager.save(PostComment, comments);
        await queryRunner.commitTransaction();
        if ((offset + BATCH) % 10000 === 0 || offset + BATCH >= CONFIG.POST_COMMENT_COUNT) {
          console.log(
            `   Post comments ${Math.min(offset + BATCH, CONFIG.POST_COMMENT_COUNT).toLocaleString()}/${CONFIG.POST_COMMENT_COUNT.toLocaleString()}`,
          );
        }
      }

      for (
        let offset = 0;
        offset < CONFIG.SITE_REVIEW_COMMENT_COUNT;
        offset += BATCH
      ) {
        await queryRunner.startTransaction();
        const size = Math.min(
          BATCH,
          CONFIG.SITE_REVIEW_COMMENT_COUNT - offset,
        );
        const comments = Array.from({ length: size }, (_, i) => {
          const idx = offset + i;
          return queryRunner.manager.create(SiteReviewComment, {
            siteReviewId: siteReviewIds[idx % siteReviewIds.length],
            userId: userIds[idx % userIds.length],
            content: faker.lorem.sentence(),
            hasChild: false,
          });
        });
        await queryRunner.manager.save(SiteReviewComment, comments);
        await queryRunner.commitTransaction();
        if ((offset + BATCH) % 10000 === 0 || offset + BATCH >= CONFIG.SITE_REVIEW_COMMENT_COUNT) {
          console.log(
            `   Site review comments ${Math.min(offset + BATCH, CONFIG.SITE_REVIEW_COMMENT_COUNT).toLocaleString()}/${CONFIG.SITE_REVIEW_COMMENT_COUNT.toLocaleString()}`,
          );
        }
      }

      const attendanceDates: Date[] = [];
      const today = new Date();
      for (let d = 0; d < CONFIG.ATTENDANCE_DAYS; d++) {
        const dte = new Date(today);
        dte.setDate(dte.getDate() - d);
        attendanceDates.push(new Date(dte.toISOString().slice(0, 10)));
      }

      let attendanceCount = 0;
      const totalAttendances = CONFIG.USER_COUNT * CONFIG.ATTENDANCE_DAYS;
      for (let i = 0; i < userIds.length; i += BATCH) {
        await queryRunner.startTransaction();
        const userChunk = userIds.slice(i, i + BATCH);
        const rows: Array<{
          userId: string;
          attendanceDate: Date;
          message?: string;
        }> = [];
        for (const userId of userChunk) {
          for (const attendanceDate of attendanceDates) {
            rows.push({
              userId,
              attendanceDate,
              message: faker.helpers.arrayElement(['Good', 'Hi', null]),
            });
          }
        }
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(Attendance)
          .values(rows)
          .orIgnore()
          .execute();
        attendanceCount += rows.length;
        await queryRunner.commitTransaction();
        if ((i + BATCH) % 1000 === 0 || i + BATCH >= userIds.length) {
          console.log(
            `   Attendances ${Math.min(attendanceCount, totalAttendances).toLocaleString()}/${totalAttendances.toLocaleString()}`,
          );
        }
      }

      const STATS_USER_BATCH = 400;
      const MAX_STATS_ROWS_PER_INSERT = 10000;

      for (let i = 0; i < userIds.length; i += STATS_USER_BATCH) {
        await queryRunner.startTransaction();
        const userChunk = userIds.slice(i, i + STATS_USER_BATCH);
        const stats: Array<{
          userId: string;
          statisticDate: Date;
          totalAttendanceDays: number;
          currentStreak: number;
          attendanceTime: Date;
        }> = [];
        for (const userId of userChunk) {
          for (let d = 0; d < CONFIG.ATTENDANCE_DAYS; d++) {
            const dte = new Date(today);
            dte.setDate(dte.getDate() - d);
            const statisticDate = new Date(dte.toISOString().slice(0, 10));
            stats.push({
              userId,
              statisticDate,
              totalAttendanceDays: d + 1,
              currentStreak: d + 1,
              attendanceTime: faker.date.recent({ days: 1 }),
            });
          }
        }

        for (let offset = 0; offset < stats.length; offset += MAX_STATS_ROWS_PER_INSERT) {
          const chunk = stats.slice(offset, offset + MAX_STATS_ROWS_PER_INSERT);
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(AttendanceStatistic)
            .values(chunk)
            .orIgnore()
            .execute();
        }

        await queryRunner.commitTransaction();
      }
      console.log('   Attendance statistics done.');

      console.log('\n✅ Performance dummy seeder completed successfully!');
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      console.error('❌ Error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
