import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserOldPassword } from './domain/entities/user-old-password.entity';
import { UserBadge } from './domain/entities/user-badge.entity';
import { UserFavoriteSite } from './domain/entities/user-favorite-site.entity';
import { UserHistorySite } from './domain/entities/user-history-site.entity';
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
import { UserController } from './interface/rest/user.controller';
import { AddFavoriteSiteUseCase } from './application/handlers/add-favorite-site.use-case';
import { RemoveFavoriteSiteUseCase } from './application/handlers/remove-favorite-site.use-case';
import { ListFavoriteSitesUseCase } from './application/handlers/list-favorite-sites.use-case';
import { PasswordService } from '../../shared/services/password.service';
import { UploadModule } from '../../shared/services/upload';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';
import { SiteModule } from '../site/site.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserOldPassword,
      UserBadge,
      UserFavoriteSite,
      UserHistorySite,
      Badge,
    ]),
    UploadModule.register({ storageType: 'local' }),
    UserTokenRepositoryModule,
    SiteModule,
  ],
  controllers: [UserController],
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
    AssignBadgeUseCase,
    RemoveBadgeUseCase,
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
