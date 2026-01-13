import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from './shared/logger/logger.module';
import { RedisModule } from './shared/redis/redis.module';
import { SocketModule } from './shared/socket/socket.module';
import { ServicesModule } from './shared/services/services.module';
import { QueueClientModule } from './shared/queue/queue-client.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AdminModule } from './modules/admin/admin.module';
import { SiteModule } from './modules/site/site.module';
import { TierModule } from './modules/tier/tier.module';
import { BadgeModule } from './modules/badge/badge.module';
import { SupportModule } from './modules/support/support.module';
import { User } from './modules/user/domain/entities/user.entity';
import { UserOldPassword } from './modules/user/domain/entities/user-old-password.entity';
import { UserToken } from './modules/auth/domain/entities/user-token.entity';
import { OtpRequest } from './modules/auth/domain/entities/otp-request.entity';
import { Role } from './modules/user/domain/entities/role.entity';
import { Permission } from './modules/user/domain/entities/permission.entity';
import { Badge } from './modules/badge/domain/entities/badge.entity';
import { UserRole } from './modules/user/domain/entities/user-role.entity';
import { UserPermission } from './modules/user/domain/entities/user-permission.entity';
import { UserBadge } from './modules/user/domain/entities/user-badge.entity';
import { UserFavoriteSite } from './modules/user/domain/entities/user-favorite-site.entity';
import { UserHistorySite } from './modules/user/domain/entities/user-history-site.entity';
import { UserSearchSite } from './modules/user/domain/entities/user-search-site.entity';
import { UserPost } from './modules/user/domain/entities/user-post.entity';
import { UserComment } from './modules/user/domain/entities/user-comment.entity';
import { Admin } from './modules/admin/domain/entities/admin.entity';
import { AdminToken } from './modules/admin/domain/entities/admin-token.entity';
import { AdminRole } from './modules/admin/domain/entities/admin-role.entity';
import { AdminPermission } from './modules/admin/domain/entities/admin-permission.entity';
import { AdminOldPassword } from './modules/user/domain/entities/admin-old-password.entity';
import { Site } from './modules/site/domain/entities/site.entity';
import { SiteCategory } from './modules/site/domain/entities/site-category.entity';
import { SiteBadge } from './modules/site/domain/entities/site-badge.entity';
import { SiteDomain } from './modules/site/domain/entities/site-domain.entity';
import { SiteView } from './modules/site/domain/entities/site-view.entity';
import { Tier } from './modules/tier/domain/entities/tier.entity';
import { UserProfile } from './modules/user/domain/entities/user-profile.entity';
import { Inquiry } from './modules/support/domain/entities/inquiry.entity';
import { Attendance } from './modules/attendance/domain/entities/attendance.entity';
import { AttendanceStatistic } from './modules/attendance/domain/entities/attendance-statistic.entity';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ScamReport } from './modules/scam-report/domain/entities/scam-report.entity';
import { ScamReportImage } from './modules/scam-report/domain/entities/scam-report-image.entity';
import { ScamReportComment } from './modules/scam-report/domain/entities/scam-report-comment.entity';
import { ScamReportCommentImage } from './modules/scam-report/domain/entities/scam-report-comment-image.entity';
import { ScamReportReaction } from './modules/scam-report/domain/entities/scam-report-reaction.entity';
import { ScamReportModule } from './modules/scam-report/scam-report.module';
import { SiteReviewModule } from './modules/site-review/site-review.module';
import { SiteReview } from './modules/site-review/domain/entities/site-review.entity';
import { SiteReviewReaction } from './modules/site-review/domain/entities/site-review-reaction.entity';
import { SiteReviewComment } from './modules/site-review/domain/entities/site-review-comment.entity';
import { SiteReviewImage } from './modules/site-review/domain/entities/site-review-image.entity';
import { SiteReviewCommentImage } from './modules/site-review/domain/entities/site-review-comment-image.entity';
import { SiteManagerModule } from './modules/site-manager/site-manager.module';
import { SiteManager } from './modules/site-manager/domain/entities/site-manager.entity';
import { SiteManagerApplication } from './modules/site-manager/domain/entities/site-manager-application.entity';
import { PocaEventModule } from './modules/poca-event/poca-event.module';
import { PocaEvent } from './modules/poca-event/domain/entities/poca-event.entity';
import { PocaEventBanner } from './modules/poca-event/domain/entities/poca-event-banner.entity';
import { PocaEventView } from './modules/poca-event/domain/entities/poca-event-view.entity';
import { GifticonModule } from './modules/gifticon/gifticon.module';
import { Gifticon } from './modules/gifticon/domain/entities/gifticon.entity';
import { PostModule } from './modules/post/post.module';
import { Post } from './modules/post/domain/entities/post.entity';
import { PostCategory } from './modules/post/domain/entities/post-category.entity';
import { PostComment } from './modules/post/domain/entities/post-comment.entity';
import { PostCommentImage } from './modules/post/domain/entities/post-comment-image.entity';
import { PostReaction } from './modules/post/domain/entities/post-reaction.entity';
import { PostCommentReaction } from './modules/post/domain/entities/post-comment-reaction.entity';
import { PostView } from './modules/post/domain/entities/post-view.entity';
import { PointTransaction } from './modules/point/domain/entities/point-transaction.entity';
import { PointExchange } from './modules/point/domain/entities/point-exchange.entity';
import { GifticonRedemption } from './modules/gifticon/domain/entities/gifticon-redemption.entity';
import { PointModule } from './modules/point/point.module';
import { PartnerModule } from './modules/partner/partner.module';
import { PartnerRequest } from './modules/partner/domain/entities/partner-request.entity';
import { SiteEventModule } from './modules/site-event/site-event.module';
import { SiteEvent } from './modules/site-event/domain/entities/site-event.entity';
import { SiteEventBanner } from './modules/site-event/domain/entities/site-event-banner.entity';
import { SiteEventView } from './modules/site-event/domain/entities/site-event-view.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'poca_db',
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
        UserSearchSite,
        UserComment,
        UserPost,
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
        Attendance,
        AttendanceStatistic,
        ScamReport,
        ScamReportImage,
        ScamReportComment,
        ScamReportCommentImage,
        ScamReportReaction,
        SiteReview,
        SiteReviewReaction,
        SiteReviewComment,
        SiteReviewImage,
        SiteReviewCommentImage,
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
        PostCommentReaction,
        PostView,
        PointTransaction,
        PointExchange,
        GifticonRedemption,
        PartnerRequest,
        SiteEvent,
        SiteEventBanner,
        SiteEventView,
      ],
      synchronize: false,
      logging: false,
    }),
    LoggerModule,
    RedisModule,
    SocketModule,
    ServicesModule,
    QueueClientModule,
    AuthModule,
    UserModule,
    AdminModule, // Must be before BadgeModule for guards injection
    BadgeModule, // Imports AdminModule for guards
    SiteModule,
    TierModule,
    SupportModule,
    AttendanceModule,
    ScamReportModule,
    SiteReviewModule,
    SiteManagerModule,
    PocaEventModule,
    GifticonModule,
    PostModule,
    PointModule,
    PartnerModule,
    SiteEventModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
