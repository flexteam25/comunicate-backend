import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { UserProfile } from '../user/domain/entities/user-profile.entity';
import { PointModule } from '../point/point.module';
import { PointTransaction } from '../point/domain/entities/point-transaction.entity';
import { GameBackendClientService } from '../../shared/services/game-backend-client.service';
import { LaunchGameUseCase } from './application/handlers/launch-game.use-case';
import { HandleGameCallbackUseCase } from './application/handlers/handle-game-callback.use-case';
import { GameCallbackGuard } from './infrastructure/guards/game-callback.guard';
import { MinigameController } from './interface/rest/user/minigame.controller';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UserPersistenceModule,
    PointModule,
    TypeOrmModule.forFeature([PointTransaction, UserProfile]),
  ],
  controllers: [MinigameController],
  providers: [
    GameBackendClientService,
    LaunchGameUseCase,
    GameCallbackGuard,
    HandleGameCallbackUseCase,
  ],
  exports: [GameBackendClientService],
})
export class MinigameModule {}
