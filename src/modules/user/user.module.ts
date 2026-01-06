import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserOldPassword } from './domain/entities/user-old-password.entity';
import { UserBadge } from './domain/entities/user-badge.entity';
import { UserFavoriteSite } from './domain/entities/user-favorite-site.entity';
import { UserHistorySite } from './domain/entities/user-history-site.entity';
import { UserComment } from './domain/entities/user-comment.entity';
import { Badge } from '../badge/domain/entities/badge.entity';
import { UserRepository } from './infrastructure/persistence/typeorm/user.repository';
import { UserOldPasswordRepository } from './infrastructure/persistence/typeorm/user-old-password.repository';
import { UserBadgeRepository } from './infrastructure/persistence/typeorm/user-badge.repository';
import { UserFavoriteSiteRepository } from './infrastructure/persistence/typeorm/user-favorite-site.repository';
import { UserHistorySiteRepository } from './infrastructure/persistence/typeorm/user-history-site.repository';
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
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { PointTransaction } from '../point/domain/entities/point-transaction.entity';
import { AddFavoriteSiteUseCase } from './application/handlers/add-favorite-site.use-case';
import { RemoveFavoriteSiteUseCase } from './application/handlers/remove-favorite-site.use-case';
import { ListFavoriteSitesUseCase } from './application/handlers/list-favorite-sites.use-case';
import { GetActivityUseCase } from './application/handlers/get-activity.use-case';
import { PasswordService } from '../../shared/services/password.service';
import { UploadModule } from '../../shared/services/upload';
import { AuthPersistenceModule } from '../auth/auth-persistence.module';
import { SiteModule } from '../site/site.module';
import { BadgeModule } from '../badge/badge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserOldPassword,
      UserBadge,
      UserFavoriteSite,
      UserHistorySite,
      UserComment,
      Badge,
      PointTransaction,
    ]),
    UploadModule.register({ storageType: 'local' }),
    AuthPersistenceModule,
    SiteModule,
    BadgeModule,
    AdminGuardsModule,
  ],
  controllers: [UserController, AdminUserController],
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
    UserRepository,
    UserOldPasswordRepository,
    UserBadgeRepository,
    UserFavoriteSiteRepository,
    UserHistorySiteRepository,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    AddFavoriteSiteUseCase,
    RemoveFavoriteSiteUseCase,
    ListFavoriteSitesUseCase,
    GetActivityUseCase,
    AssignBadgeUseCase,
    RemoveBadgeUseCase,
    ListUsersUseCase,
    GetUserDetailUseCase,
    UpdateUserUseCase,
    CreateUserUseCase,
    DeleteUserUseCase,
    PasswordService,
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
    AssignBadgeUseCase,
    RemoveBadgeUseCase,
  ],
})
export class UserModule {}
