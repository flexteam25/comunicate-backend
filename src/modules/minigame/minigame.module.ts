import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { UserProfile } from '../user/domain/entities/user-profile.entity';
import { PointModule } from '../point/point.module';
import { PointTransaction } from '../point/domain/entities/point-transaction.entity';
import { RedisModule } from '../../shared/redis/redis.module';
import { LoggerModule } from '../../shared/logger/logger.module';
import { GameBackendClientModule } from '../../shared/services/game-backend-client.module';
import { QueueClientModule } from '../../shared/queue/queue-client.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { LaunchGameUseCase } from './application/handlers/launch-game.use-case';
import { HandleGameCallbackUseCase } from './application/handlers/handle-game-callback.use-case';
import { GameSyncPointSubscriber } from './application/subscribers/game-sync-point.subscriber';
import { GameCallbackGuard } from './infrastructure/guards/game-callback.guard';
import { BetHistory } from './domain/entities/bet-history.entity';
import { GetSelfBetHistoryUseCase } from './application/handlers/get-self-bet-history.use-case';
import { MinigameController } from './interface/rest/user/minigame.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { AdminBetHistoryController } from './interface/rest/admin/bet-history.controller';
import { ListAdminBetHistoriesUseCase } from './application/handlers/admin/list-admin-bet-histories.use-case';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UserPersistenceModule,
    PointModule,
    RedisModule,
    LoggerModule,
    GameBackendClientModule,
    QueueClientModule,
    SystemSettingsModule,
    AdminGuardsModule,
    TypeOrmModule.forFeature([PointTransaction, UserProfile, BetHistory]),
  ],
  controllers: [MinigameController, AdminBetHistoryController],
  providers: [
    LaunchGameUseCase,
    GameCallbackGuard,
    HandleGameCallbackUseCase,
    GetSelfBetHistoryUseCase,
    ListAdminBetHistoriesUseCase,
    GameSyncPointSubscriber,
  ],
  exports: [],
})
export class MinigameModule {}
