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
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { LaunchGameUseCase } from './application/handlers/launch-game.use-case';
import { HandleGameCallbackUseCase } from './application/handlers/handle-game-callback.use-case';
import { GameSyncPointSubscriber } from './application/subscribers/game-sync-point.subscriber';
import { GameCallbackGuard } from './infrastructure/guards/game-callback.guard';
import { MinigameController } from './interface/rest/user/minigame.controller';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UserPersistenceModule,
    PointModule,
    RedisModule,
    LoggerModule,
    GameBackendClientModule,
    SystemSettingsModule,
    TypeOrmModule.forFeature([PointTransaction, UserProfile]),
  ],
  controllers: [MinigameController],
  providers: [
    LaunchGameUseCase,
    GameCallbackGuard,
    HandleGameCallbackUseCase,
    GameSyncPointSubscriber,
  ],
  exports: [],
})
export class MinigameModule {}
