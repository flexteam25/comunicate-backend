import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Admin } from './domain/entities/admin.entity';
import { AdminToken } from './domain/entities/admin-token.entity';
import { AdminRole } from './domain/entities/admin-role.entity';
import { AdminPermission } from './domain/entities/admin-permission.entity';
import { AdminOldPassword } from '../user/domain/entities/admin-old-password.entity';
import { Permission } from '../user/domain/entities/permission.entity';
import { AdminRepository } from './infrastructure/persistence/typeorm/admin.repository';
import { AdminTokenRepository } from './infrastructure/persistence/typeorm/admin-token.repository';
import { AdminPermissionRepository } from './infrastructure/persistence/typeorm/admin-permission.repository';
import { AdminOldPasswordRepository } from './infrastructure/persistence/typeorm/admin-old-password.repository';
import { LoginUseCase } from './application/handlers/login.use-case';
import { RefreshTokenUseCase } from './application/handlers/refresh-token.use-case';
import { LogoutUseCase } from './application/handlers/logout.use-case';
import { RequestOtpUseCase } from './application/handlers/request-otp.use-case';
import { ResetPasswordUseCase } from './application/handlers/reset-password.use-case';
import { ChangePasswordUseCase } from './application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from './application/handlers/update-profile.use-case';
import { GetMeUseCase } from './application/handlers/get-me.use-case';
import { CreateAdminUseCase } from './application/handlers/create-admin.use-case';
import { AdminController } from './interface/rest/admin.controller';
import { PasswordService } from '../../shared/services/password.service';
import { JwtService } from '../../shared/services/jwt.service';
import { TransactionService } from '../../shared/services/transaction.service';
import { QueueClientModule } from '../../shared/queue/queue-client.module';
import { AdminJwtAuthGuard } from './infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from './infrastructure/guards/admin-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      AdminToken,
      AdminRole,
      AdminPermission,
      AdminOldPassword,
      Permission,
    ]),
    ConfigModule,
    QueueClientModule,
  ],
  controllers: [AdminController],
  providers: [
    {
      provide: 'IAdminRepository',
      useClass: AdminRepository,
    },
    {
      provide: 'IAdminTokenRepository',
      useClass: AdminTokenRepository,
    },
    {
      provide: 'IAdminPermissionRepository',
      useClass: AdminPermissionRepository,
    },
    {
      provide: 'IAdminOldPasswordRepository',
      useClass: AdminOldPasswordRepository,
    },
    AdminRepository,
    AdminTokenRepository,
    AdminPermissionRepository,
    AdminOldPasswordRepository,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RequestOtpUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    GetMeUseCase,
    CreateAdminUseCase,
    PasswordService,
    JwtService,
    TransactionService,
    AdminJwtAuthGuard,
    AdminPermissionGuard,
  ],
  exports: [
    'IAdminRepository',
    'IAdminTokenRepository',
    'IAdminPermissionRepository',
    'IAdminOldPasswordRepository',
    AdminJwtAuthGuard,
    AdminPermissionGuard,
  ],
})
export class AdminModule {}

