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
import { GameDailyStats } from './domain/entities/game-daily-stats.entity';
import { GameDailyStatsRepository } from './infrastructure/persistence/typeorm/game-daily-stats.repository';
import { GetSelfBetHistoryUseCase } from './application/handlers/get-self-bet-history.use-case';
import { GetLeaderboardUseCase } from './application/handlers/get-leaderboard.use-case';
import { MinigameController } from './interface/rest/user/minigame.controller';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';
import { AdminBetHistoryController } from './interface/rest/admin/bet-history.controller';
import { AdminMinigamePlayingController } from './interface/rest/admin/minigame-playing.controller';
import { ListAdminBetHistoriesUseCase } from './application/handlers/admin/list-admin-bet-histories.use-case';
import { GetPlayingUsersUseCase } from './application/handlers/admin/get-playing-users.use-case';
import { GetAdminLeaderboardUseCase } from './application/handlers/admin/get-admin-leaderboard.use-case';
import { MinigamePlayingStateService } from './application/services/minigame-playing-state.service';

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
    TypeOrmModule.forFeature([PointTransaction, UserProfile, BetHistory, GameDailyStats]),
  ],
  controllers: [MinigameController, AdminBetHistoryController, AdminMinigamePlayingController],
  providers: [
    MinigamePlayingStateService,
    GameDailyStatsRepository,
    LaunchGameUseCase,
    GameCallbackGuard,
    HandleGameCallbackUseCase,
    GetSelfBetHistoryUseCase,
    GetLeaderboardUseCase,
    ListAdminBetHistoriesUseCase,
    GetPlayingUsersUseCase,
    GetAdminLeaderboardUseCase,
    GameSyncPointSubscriber,
  ],
  exports: [],
})
export class MinigameModule {}
