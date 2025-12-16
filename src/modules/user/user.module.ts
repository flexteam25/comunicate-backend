import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserOldPassword } from './domain/entities/user-old-password.entity';
import { UserBadge } from './domain/entities/user-badge.entity';
import { Badge } from '../badge/domain/entities/badge.entity';
import { UserRepository } from './infrastructure/persistence/typeorm/user.repository';
import { UserOldPasswordRepository } from './infrastructure/persistence/typeorm/user-old-password.repository';
import { UserBadgeRepository } from './infrastructure/persistence/typeorm/user-badge.repository';
import { ChangePasswordUseCase } from './application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from './application/handlers/update-profile.use-case';
import { AssignBadgeUseCase } from './application/handlers/admin/assign-badge.use-case';
import { RemoveBadgeUseCase } from './application/handlers/admin/remove-badge.use-case';
import { UserController } from './interface/rest/user.controller';
import { PasswordService } from '../../shared/services/password.service';
import { UploadModule } from '../../shared/services/upload';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserOldPassword, UserBadge, Badge]),
    UploadModule.register({ storageType: 'local' }),
    UserTokenRepositoryModule,
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
    UserRepository,
    UserOldPasswordRepository,
    UserBadgeRepository,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
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
    AssignBadgeUseCase,
    RemoveBadgeUseCase,
  ],
})
export class UserModule {}
