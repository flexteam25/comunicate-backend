import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserRepository } from './infrastructure/persistence/typeorm/user.repository';
import { ChangePasswordUseCase } from './application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from './application/handlers/update-profile.use-case';
import { UserController } from './interface/rest/user.controller';
import { PasswordService } from '../../shared/services/password.service';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../../shared/services/upload';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),
    UploadModule.register({ storageType: 'local' }),
  ],
  controllers: [UserController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    UserRepository,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    PasswordService,
  ],
  exports: [UserRepository, 'IUserRepository'],
})
export class UserModule {}
