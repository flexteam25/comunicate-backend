import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from '../site/domain/entities/site.entity';
import { SiteCategory } from '../site/domain/entities/site-category.entity';
import { User } from '../user/domain/entities/user.entity';
import { UserProfile } from '../user/domain/entities/user-profile.entity';
import { PointTransaction } from '../point/domain/entities/point-transaction.entity';
import { SiteRequestPersistenceModule } from './infrastructure/persistence/site-request-persistence.module';
import { SitePersistenceModule } from '../site/site-persistence.module';
import { TierModule } from '../tier/tier.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { UploadModule } from '../../shared/services/upload';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { LoggerModule } from '../../shared/logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { SiteRequestController } from './interface/rest/user/site-request.controller';
import { AdminSiteRequestController } from './interface/rest/admin/site-request.controller';
import { CreateSiteRequestUseCase } from './application/handlers/user/create-site-request.use-case';
import { ListSiteRequestsUseCase } from './application/handlers/user/list-site-requests.use-case';
import { GetSiteRequestUseCase } from './application/handlers/user/get-site-request.use-case';
import { CancelSiteRequestUseCase } from './application/handlers/user/cancel-site-request.use-case';
import { ListSiteRequestsUseCase as AdminListSiteRequestsUseCase } from './application/handlers/admin/list-site-requests.use-case';
import { ApproveSiteRequestUseCase } from './application/handlers/admin/approve-site-request.use-case';
import { RejectSiteRequestUseCase } from './application/handlers/admin/reject-site-request.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Site, SiteCategory, User, UserProfile, PointTransaction]),
    SiteRequestPersistenceModule,
    SitePersistenceModule,
    TierModule,
    UserPersistenceModule,
    UploadModule.register({ storageType: 'local' }),
    AdminGuardsModule,
    AuthPersistenceModule,
    RedisModule,
    LoggerModule,
    ConfigModule,
  ],
  providers: [
    // User use cases
    CreateSiteRequestUseCase,
    ListSiteRequestsUseCase,
    GetSiteRequestUseCase,
    CancelSiteRequestUseCase,
    // Admin use cases
    AdminListSiteRequestsUseCase,
    ApproveSiteRequestUseCase,
    RejectSiteRequestUseCase,
  ],
  controllers: [SiteRequestController, AdminSiteRequestController],
  exports: [SiteRequestPersistenceModule],
})
export class SiteRequestModule {}
