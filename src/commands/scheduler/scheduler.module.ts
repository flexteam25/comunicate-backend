import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerCommand } from './scheduler.command';
import { LoggerModule } from '../../shared/logger/logger.module';
import { User } from '../../modules/user/domain/entities/user.entity';
import { UserOldPassword } from '../../modules/user/domain/entities/user-old-password.entity';
import { UserToken } from '../../modules/auth/domain/entities/user-token.entity';
import { OtpRequest } from '../../modules/auth/domain/entities/otp-request.entity';
import { Role } from '../../modules/user/domain/entities/role.entity';
import { Permission } from '../../modules/user/domain/entities/permission.entity';
import { Badge } from '../../modules/badge/domain/entities/badge.entity';
import { UserRole } from '../../modules/user/domain/entities/user-role.entity';
import { UserPermission } from '../../modules/user/domain/entities/user-permission.entity';
import { UserBadge } from '../../modules/user/domain/entities/user-badge.entity';
import { UserFavoriteSite } from '../../modules/user/domain/entities/user-favorite-site.entity';
import { UserHistorySite } from '../../modules/user/domain/entities/user-history-site.entity';
import { UserComment } from '../../modules/user/domain/entities/user-comment.entity';
import { Admin } from '../../modules/admin/domain/entities/admin.entity';
import { AdminToken } from '../../modules/admin/domain/entities/admin-token.entity';
import { AdminRole } from '../../modules/admin/domain/entities/admin-role.entity';
import { AdminPermission } from '../../modules/admin/domain/entities/admin-permission.entity';
import { AdminOldPassword } from '../../modules/user/domain/entities/admin-old-password.entity';
import { Site } from '../../modules/site/domain/entities/site.entity';
import { SiteCategory } from '../../modules/site/domain/entities/site-category.entity';
import { SiteBadge } from '../../modules/site/domain/entities/site-badge.entity';
import { SiteDomain } from '../../modules/site/domain/entities/site-domain.entity';
import { SiteView } from '../../modules/site/domain/entities/site-view.entity';
import { Tier } from '../../modules/tier/domain/entities/tier.entity';
import { UserProfile } from '../../modules/user/domain/entities/user-profile.entity';
import { UserIp } from '../../modules/user/domain/entities/user-ip.entity';
import { BlockedIp } from '../../modules/user/domain/entities/blocked-ip.entity';
import { Inquiry } from '../../modules/support/domain/entities/inquiry.entity';
import { Attendance } from '../../modules/attendance/domain/entities/attendance.entity';
import { AttendanceStatistic } from '../../modules/attendance/domain/entities/attendance-statistic.entity';
import { ScamReport } from '../../modules/scam-report/domain/entities/scam-report.entity';
import { ScamReportImage } from '../../modules/scam-report/domain/entities/scam-report-image.entity';
import { ScamReportComment } from '../../modules/scam-report/domain/entities/scam-report-comment.entity';
import { ScamReportCommentImage } from '../../modules/scam-report/domain/entities/scam-report-comment-image.entity';
import { ScamReportReaction } from '../../modules/scam-report/domain/entities/scam-report-reaction.entity';
import { SiteReviewImage } from '../../modules/site-review/domain/entities/site-review-image.entity';
import { SiteReview } from '../../modules/site-review/domain/entities/site-review.entity';
import { SiteReviewReaction } from '../../modules/site-review/domain/entities/site-review-reaction.entity';
import { SiteReviewComment } from '../../modules/site-review/domain/entities/site-review-comment.entity';
import { SiteManager } from '../../modules/site-manager/domain/entities/site-manager.entity';
import { SiteManagerApplication } from '../../modules/site-manager/domain/entities/site-manager-application.entity';
import { PocaEvent } from '../../modules/poca-event/domain/entities/poca-event.entity';
import { PocaEventBanner } from '../../modules/poca-event/domain/entities/poca-event-banner.entity';
import { PocaEventView } from '../../modules/poca-event/domain/entities/poca-event-view.entity';
import { Gifticon } from '../../modules/gifticon/domain/entities/gifticon.entity';
import { Post } from '../../modules/post/domain/entities/post.entity';
import { PostCategory } from '../../modules/post/domain/entities/post-category.entity';
import { PostComment } from '../../modules/post/domain/entities/post-comment.entity';
import { PostCommentImage } from '../../modules/post/domain/entities/post-comment-image.entity';
import { PostReaction } from '../../modules/post/domain/entities/post-reaction.entity';
import { PostView } from '../../modules/post/domain/entities/post-view.entity';
import { PointTransaction } from '../../modules/point/domain/entities/point-transaction.entity';
import { PointExchange } from '../../modules/point/domain/entities/point-exchange.entity';
import { GifticonRedemption } from '../../modules/gifticon/domain/entities/gifticon-redemption.entity';
import { PartnerRequest } from '../../modules/partner/domain/entities/partner-request.entity';
import { SiteEvent } from '../../modules/site-event/domain/entities/site-event.entity';
import { SiteEventBanner } from '../../modules/site-event/domain/entities/site-event-banner.entity';
import { SiteEventView } from '../../modules/site-event/domain/entities/site-event-view.entity';
import { SiteBadgeRequest } from '../../modules/site/domain/entities/site-badge-request.entity';
import { SiteBadgeRequestImage } from '../../modules/site/domain/entities/site-badge-request-image.entity';
import { SiteReviewCommentImage } from '../../modules/site-review/domain/entities/site-review-comment-image.entity';
import { UserIpSyncService } from './user-ip-sync.service';
import { UserIpRepository } from '../../modules/user/infrastructure/persistence/repositories/user-ip.repository';
import { BlockedIpRepository } from '../../modules/user/infrastructure/persistence/typeorm/blocked-ip.repository';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf((info) => {
              const { timestamp, level, message, context } = info as {
                timestamp: string;
                level: string;
                message: string;
                context?: string;
              };
              return `${timestamp} [${context || 'App'}] ${level}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/scheduler.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    LoggerModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [
        User,
        UserOldPassword,
        UserToken,
        OtpRequest,
        Role,
        Permission,
        Badge,
        UserRole,
        UserPermission,
        UserBadge,
        UserFavoriteSite,
        UserHistorySite,
        UserComment,
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
        UserIp,
        BlockedIp,
        Inquiry,
        Attendance,
        AttendanceStatistic,
        ScamReport,
        ScamReportImage,
        ScamReportComment,
        ScamReportCommentImage,
        ScamReportReaction,
        SiteReviewImage,
        SiteReview,
        SiteReviewReaction,
        SiteReviewComment,
        SiteManager,
        SiteManagerApplication,
        PocaEvent,
        PocaEventBanner,
        PocaEventView,
        Gifticon,
        Post,
        PostCategory,
        PostComment,
        PostCommentImage,
        PostReaction,
        PostView,
        PointTransaction,
        PointExchange,
        GifticonRedemption,
        PartnerRequest,
        SiteEvent,
        SiteEventBanner,
        SiteEventView,
        SiteBadgeRequest,
        SiteBadgeRequestImage,
        SiteReviewCommentImage,
        SiteReviewCommentImage,
      ],
      synchronize: false,
      logging: false,
    }),
    ScheduleModule.forRoot(), // Enable cron scheduling
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: parseInt(configService.get<string>('REDIS_DB', '0'), 10),
        };

        return {
          connection: redisConfig,
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    TypeOrmModule.forFeature([UserIp, BlockedIp]),
  ],
  providers: [
    SchedulerCommand,
    UserIpSyncService,
    {
      provide: 'IUserIpRepository',
      useClass: UserIpRepository,
    },
    {
      provide: 'IBlockedIpRepository',
      useClass: BlockedIpRepository,
    },
    UserIpRepository,
    BlockedIpRepository,
  ],
  exports: [UserIpSyncService],
})
export class SchedulerCommandModule {}
