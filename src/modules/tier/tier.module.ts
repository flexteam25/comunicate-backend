import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tier } from './domain/entities/tier.entity';
import { TierRepository } from './infrastructure/persistence/typeorm/tier.repository';
import { CreateTierUseCase } from './application/handlers/admin/create-tier.use-case';
import { UpdateTierUseCase } from './application/handlers/admin/update-tier.use-case';
import { DeleteTierUseCase } from './application/handlers/admin/delete-tier.use-case';
import { ListTiersUseCase } from './application/handlers/admin/list-tiers.use-case';
import { ListTiersUseCase as UserListTiersUseCase } from './application/handlers/user/list-tiers.use-case';
import { RestoreTierUseCase } from './application/handlers/admin/restore-tier.use-case';
import { AdminTierController } from './interface/rest/admin/tier.controller';
import { UserTierController } from './interface/rest/user/tier.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { SitePersistenceModule } from '../site/site-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tier]),
    AdminGuardsModule,
    SitePersistenceModule,
    ServicesModule,
  ],
  providers: [
    {
      provide: 'ITierRepository',
      useClass: TierRepository,
    },
    TierRepository,
    CreateTierUseCase,
    UpdateTierUseCase,
    DeleteTierUseCase,
    ListTiersUseCase,
    UserListTiersUseCase,
    RestoreTierUseCase,
  ],
  controllers: [AdminTierController, UserTierController],
  exports: ['ITierRepository', TierRepository],
})
export class TierModule {}
