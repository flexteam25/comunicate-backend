import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from './domain/entities/badge.entity';
import { BadgeRepository } from './infrastructure/persistence/typeorm/badge.repository';
import { CreateBadgeUseCase } from './application/handlers/admin/create-badge.use-case';
import { UpdateBadgeUseCase } from './application/handlers/admin/update-badge.use-case';
import { DeleteBadgeUseCase } from './application/handlers/admin/delete-badge.use-case';
import { ListBadgesUseCase } from './application/handlers/admin/list-badges.use-case';
import { GetBadgeUseCase } from './application/handlers/admin/get-badge.use-case';
import { RestoreBadgeUseCase } from './application/handlers/admin/restore-badge.use-case';
import { AdminBadgeController } from './interface/rest/admin/badge.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { UploadModule } from '../../shared/services/upload';

@Module({
  imports: [
    TypeOrmModule.forFeature([Badge]),
    AdminGuardsModule,
    UploadModule.register({ storageType: 'local' }),
  ],
  providers: [
    {
      provide: 'IBadgeRepository',
      useClass: BadgeRepository,
    },
    BadgeRepository,
    CreateBadgeUseCase,
    UpdateBadgeUseCase,
    DeleteBadgeUseCase,
    ListBadgesUseCase,
    GetBadgeUseCase,
    RestoreBadgeUseCase,
  ],
  controllers: [AdminBadgeController],
  exports: ['IBadgeRepository', BadgeRepository],
})
export class BadgeModule {}
