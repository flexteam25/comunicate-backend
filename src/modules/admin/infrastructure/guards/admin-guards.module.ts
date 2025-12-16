import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../../domain/entities/admin.entity';
import { AdminToken } from '../../domain/entities/admin-token.entity';
import { AdminPermission } from '../../domain/entities/admin-permission.entity';
import { Permission } from '../../../user/domain/entities/permission.entity';
import { AdminRepository } from '../persistence/typeorm/admin.repository';
import { AdminTokenRepository } from '../persistence/typeorm/admin-token.repository';
import { AdminPermissionRepository } from '../persistence/typeorm/admin-permission.repository';
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard';
import { AdminPermissionGuard } from './admin-permission.guard';
import { JwtService } from '../../../../shared/services/jwt.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, AdminToken, AdminPermission, Permission])],
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
    AdminRepository,
    AdminTokenRepository,
    AdminPermissionRepository,
    JwtService,
    AdminJwtAuthGuard,
    AdminPermissionGuard,
  ],
  exports: [
    'IAdminRepository',
    'IAdminTokenRepository',
    'IAdminPermissionRepository',
    AdminJwtAuthGuard,
    AdminPermissionGuard,
  ],
})
export class AdminGuardsModule {}
