import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserOldPassword } from './domain/entities/user-old-password.entity';
import { UserBadge } from './domain/entities/user-badge.entity';
import { UserFavoriteSite } from './domain/entities/user-favorite-site.entity';
import { UserHistorySite } from './domain/entities/user-history-site.entity';
import { UserSearchSite } from './domain/entities/user-search-site.entity';
import { UserComment } from './domain/entities/user-comment.entity';
import { UserPost } from './domain/entities/user-post.entity';
import { UserBadgeRequest } from './domain/entities/user-badge-request.entity';
import { UserBadgeRequestImage } from './domain/entities/user-badge-request-image.entity';
import { UserIp } from './domain/entities/user-ip.entity';
import { BlockedIp } from './domain/entities/blocked-ip.entity';
import { Badge } from '../badge/domain/entities/badge.entity';
import { UserRepository } from './infrastructure/persistence/typeorm/user.repository';
import { UserOldPasswordRepository } from './infrastructure/persistence/typeorm/user-old-password.repository';
import { UserBadgeRepository } from './infrastructure/persistence/typeorm/user-badge.repository';
import { UserFavoriteSiteRepository } from './infrastructure/persistence/typeorm/user-favorite-site.repository';
import { UserHistorySiteRepository } from './infrastructure/persistence/typeorm/user-history-site.repository';
import { UserBadgeRequestRepository } from './infrastructure/persistence/typeorm/user-badge-request.repository';
import { UserBadgeRequestImageRepository } from './infrastructure/persistence/typeorm/user-badge-request-image.repository';
import { UserHistorySitePersistenceModule } from './user-history-site-persistence.module';
import { UserSearchSitePersistenceModule } from './user-search-site-persistence.module';
import { ChangePasswordUseCase } from './application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from './application/handlers/update-profile.use-case';
import { AssignBadgeUseCase } from './application/handlers/admin/assign-badge.use-case';
import { RemoveBadgeUseCase } from './application/handlers/admin/remove-badge.use-case';
import { ListUsersUseCase } from './application/handlers/admin/list-users.use-case';
import { GetUserDetailUseCase } from './application/handlers/admin/get-user-detail.use-case';
import { UpdateUserUseCase } from './application/handlers/admin/update-user.use-case';
import { CreateUserUseCase } from './application/handlers/admin/create-user.use-case';
import { DeleteUserUseCase } from './application/handlers/admin/delete-user.use-case';
import { UserController } from './interface/rest/user.controller';
import { AdminUserController } from './interface/rest/admin/user.controller';
import { UserBadgeRequestController } from './interface/rest/user-badge-request.controller';
import { AdminUserBadgeRequestController } from './interface/rest/admin/user-badge-request.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { PointTransaction } from '../point/domain/entities/point-transaction.entity';
import { AddFavoriteSiteUseCase } from './application/handlers/add-favorite-site.use-case';
import { RemoveFavoriteSiteUseCase } from './application/handlers/remove-favorite-site.use-case';
import { ListFavoriteSitesUseCase } from './application/handlers/list-favorite-sites.use-case';
import { GetActivityUseCase } from './application/handlers/get-activity.use-case';
import { SaveSearchHistoryUseCase } from './application/handlers/save-search-history.use-case';
import { GetSearchHistoryUseCase } from './application/handlers/get-search-history.use-case';
import { DeleteSearchHistoryUseCase } from './application/handlers/delete-search-history.use-case';
import { DeleteSiteHistoryUseCase } from './application/handlers/delete-site-history.use-case';
import { CreateUserBadgeRequestUseCase } from './application/handlers/user/create-user-badge-request.use-case';
import { ListUserBadgeRequestsUseCase } from './application/handlers/user/list-user-badge-requests.use-case';
import { CancelUserBadgeRequestUseCase } from './application/handlers/user/cancel-user-badge-request.use-case';
import { ListAllUserBadgeRequestsUseCase } from './application/handlers/admin/list-all-user-badge-requests.use-case';
import { ApproveUserBadgeRequestUseCase } from './application/handlers/admin/approve-user-badge-request.use-case';
import { RejectUserBadgeRequestUseCase } from './application/handlers/admin/reject-user-badge-request.use-case';
import { PasswordService } from '../../shared/services/password.service';
import { TransactionService } from '../../shared/services/transaction.service';
import { UploadModule } from '../../shared/services/upload';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { SiteModule } from '../site/site.module';
import { BadgeModule } from '../badge/badge.module';
import { PostPersistenceModule } from '../post/post-persistence.module';
import { UserIpRepository } from './infrastructure/persistence/repositories/user-ip.repository';
import { BlockedIpRepository } from './infrastructure/persistence/typeorm/blocked-ip.repository';
import { RedisModule } from '../../shared/redis/redis.module';
import { TriggerIpSyncUseCase } from './application/handlers/admin/trigger-ip-sync.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserOldPassword,
      UserBadge,
      UserFavoriteSite,
      UserHistorySite,
      UserSearchSite,
      UserComment,
      UserPost,
      UserBadgeRequest,
      UserBadgeRequestImage,
      UserIp,
      BlockedIp,
      Badge,
      PointTransaction,
    ]),
    PostPersistenceModule,
    UploadModule.register({ storageType: 'local' }),
    AuthPersistenceModule,
    SiteModule,
    BadgeModule,
    AdminGuardsModule,
    UserHistorySitePersistenceModule,
    UserSearchSitePersistenceModule,
    PostPersistenceModule,
    RedisModule,
  ],
  controllers: [
    UserController,
    AdminUserController,
    UserBadgeRequestController,
    AdminUserBadgeRequestController,
  ],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IUserOldPasswordRepository',
      useClass: UserOldPasswordRepository,
    },
    {
      provide: 'IUserBadgeRepository',
      useClass: UserBadgeRepository,
    },
    {
      provide: 'IUserFavoriteSiteRepository',
      useClass: UserFavoriteSiteRepository,
    },
    {
      provide: 'IUserHistorySiteRepository',
      useClass: UserHistorySiteRepository,
    },
    {
      provide: 'IUserBadgeRequestRepository',
      useClass: UserBadgeRequestRepository,
    },
    {
      provide: 'IUserBadgeRequestImageRepository',
      useClass: UserBadgeRequestImageRepository,
    },
    {
      provide: 'IUserIpRepository',
      useClass: UserIpRepository,
    },
    {
      provide: 'IBlockedIpRepository',
      useClass: BlockedIpRepository,
    },
    UserRepository,
    UserOldPasswordRepository,
    UserBadgeRepository,
    UserFavoriteSiteRepository,
    UserHistorySiteRepository,
    UserBadgeRequestRepository,
    UserBadgeRequestImageRepository,
    UserIpRepository,
    BlockedIpRepository,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    AddFavoriteSiteUseCase,
    RemoveFavoriteSiteUseCase,
    ListFavoriteSitesUseCase,
    GetActivityUseCase,
    SaveSearchHistoryUseCase,
    GetSearchHistoryUseCase,
    DeleteSearchHistoryUseCase,
    DeleteSiteHistoryUseCase,
    AssignBadgeUseCase,
    RemoveBadgeUseCase,
    ListUsersUseCase,
    GetUserDetailUseCase,
    UpdateUserUseCase,
    CreateUserUseCase,
    DeleteUserUseCase,
    CreateUserBadgeRequestUseCase,
    ListUserBadgeRequestsUseCase,
    CancelUserBadgeRequestUseCase,
    ListAllUserBadgeRequestsUseCase,
    ApproveUserBadgeRequestUseCase,
    RejectUserBadgeRequestUseCase,
    TriggerIpSyncUseCase,
    PasswordService,
    TransactionService,
  ],
  exports: [
    UserRepository,
    'IUserRepository',
    UserOldPasswordRepository,
    'IUserOldPasswordRepository',
    UserBadgeRepository,
    'IUserBadgeRepository',
    UserFavoriteSiteRepository,
    'IUserFavoriteSiteRepository',
    UserIpRepository,
    'IUserIpRepository',
    AssignBadgeUseCase,
    RemoveBadgeUseCase,
  ],
})
export class UserModule {}
