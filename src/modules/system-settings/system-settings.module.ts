import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../../shared/redis/redis.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { SystemSetting } from './domain/entities/system-setting.entity';
import { SystemSettingRepository } from './infrastructure/persistence/typeorm/system-setting.repository';
import { GetSystemSettingByKeyUseCase } from './application/handlers/get-system-setting-by-key.use-case';
import { UpdateSystemSettingValueUseCase } from './application/handlers/admin/update-system-setting-value.use-case';
import { MaintenanceCheckService } from './application/services/maintenance-check.service';
import { MaintenanceMiddleware } from '../../shared/middleware/maintenance.middleware';
import { SystemSettingAdminController } from './interface/rest/admin/system-setting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting]),
    RedisModule,
    AdminGuardsModule,
  ],
  controllers: [SystemSettingAdminController],
  providers: [
    {
      provide: 'ISystemSettingRepository',
      useClass: SystemSettingRepository,
    },
    SystemSettingRepository,
    GetSystemSettingByKeyUseCase,
    UpdateSystemSettingValueUseCase,
    MaintenanceCheckService,
    MaintenanceMiddleware,
  ],
  exports: [MaintenanceMiddleware, MaintenanceCheckService],
})
export class SystemSettingsModule {}
