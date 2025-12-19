import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QueueWorkerCommand } from "./queue-worker.command";
import { QueueWorkerModule as SharedQueueWorkerModule } from "../../shared/queue/queue-worker.module";
import { User } from "../../modules/user/domain/entities/user.entity";
import { UserOldPassword } from "../../modules/user/domain/entities/user-old-password.entity";
import { UserToken } from "../../modules/auth/domain/entities/user-token.entity";
import { Role } from "../../modules/user/domain/entities/role.entity";
import { Permission } from "../../modules/user/domain/entities/permission.entity";
import { Badge } from "../../modules/badge/domain/entities/badge.entity";
import { UserRole } from "../../modules/user/domain/entities/user-role.entity";
import { UserPermission } from "../../modules/user/domain/entities/user-permission.entity";
import { UserBadge } from "../../modules/user/domain/entities/user-badge.entity";
import { UserFavoriteSite } from "../../modules/user/domain/entities/user-favorite-site.entity";
import { UserHistorySite } from "../../modules/user/domain/entities/user-history-site.entity";
import { Admin } from "../../modules/admin/domain/entities/admin.entity";
import { AdminToken } from "../../modules/admin/domain/entities/admin-token.entity";
import { AdminRole } from "../../modules/admin/domain/entities/admin-role.entity";
import { AdminPermission } from "../../modules/admin/domain/entities/admin-permission.entity";
import { AdminOldPassword } from "../../modules/user/domain/entities/admin-old-password.entity";
import { Site } from "../../modules/site/domain/entities/site.entity";
import { SiteCategory } from "../../modules/site/domain/entities/site-category.entity";
import { SiteBadge } from "../../modules/site/domain/entities/site-badge.entity";
import { SiteDomain } from "../../modules/site/domain/entities/site-domain.entity";
import { SiteView } from "../../modules/site/domain/entities/site-view.entity";
import { Tier } from "../../modules/tier/domain/entities/tier.entity";
import { UserProfile } from "../../modules/user/domain/entities/user-profile.entity";
import { Inquiry } from "../../modules/support/domain/entities/inquiry.entity";
import { Feedback } from "../../modules/support/domain/entities/feedback.entity";
import { BugReport } from "../../modules/support/domain/entities/bug-report.entity";
import { AdvertisingContact } from "../../modules/support/domain/entities/advertising-contact.entity";
import { Attendance } from "../../modules/attendance/domain/entities/attendance.entity";
import { AttendanceStatistic } from "../../modules/attendance/domain/entities/attendance-statistic.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [
        User,
        UserOldPassword,
        UserToken,
        Role,
        Permission,
        Badge,
        UserRole,
        UserPermission,
        UserBadge,
        UserFavoriteSite,
        UserHistorySite,
        Admin,
        AdminToken,
        AdminRole,
        AdminPermission,
        AdminOldPassword,
        Site,
        SiteCategory,
        SiteBadge,
        SiteDomain,
        SiteView,
        Tier,
        UserProfile,
        Inquiry,
        Feedback,
        BugReport,
        AdvertisingContact,
        Attendance,
        AttendanceStatistic,
      ],
      synchronize: false,
      logging: false,
    }),
    SharedQueueWorkerModule, // Import processors and GameModule
  ],
  providers: [QueueWorkerCommand],
})
export class QueueWorkerCommandModule {}
