import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserRepository } from './infrastructure/persistence/typeorm/user.repository';
import { ChangePasswordUseCase } from './application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from './application/handlers/update-profile.use-case';
import { UserController } from './interface/rest/user.controller';
import { PasswordService } from '../../shared/services/password.service';
import { IUserRepository } from './infrastructure/persistence/repositories/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
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
