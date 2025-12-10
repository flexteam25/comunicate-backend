import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as winston from 'winston';
import { NotificationProcessor } from './processors/notification.processor';
import { MinigameSocketDataProcessor } from './processors/minigame-socket-data.processor';
import { BettingResultProcessor } from './processors/betting-result.processor';
import { LoggerModule } from '../logger/logger.module';
import { RedisModule } from '../redis/redis.module';
import { SocketModule } from '../socket/socket.module';
import { Transaction } from '../../domains/game/entities/transaction.entity';
import { PowerballRoundInfo } from '../../domains/game/entities/powerball-round-info.entity';
import { Powerball3RoundInfo } from '../../domains/game/entities/powerball3-round-info.entity';
import { Powerball5RoundInfo } from '../../domains/game/entities/powerball5-round-info.entity';
import { PowerladderRoundInfo } from '../../domains/game/entities/powerladder-round-info.entity';
import { Powerladder3RoundInfo } from '../../domains/game/entities/powerladder3-round-info.entity';
import { Powerladder5RoundInfo } from '../../domains/game/entities/powerladder5-round-info.entity';
import { Rball56RoundInfo } from '../../domains/game/entities/rball56-round-info.entity';
import { Runningball54RoundInfo } from '../../domains/game/entities/runningball54-round-info.entity';
import { Runningball3RoundInfo } from '../../domains/game/entities/runningball3-round-info.entity';
import { Space8RoundInfo } from '../../domains/game/entities/space8-round-info.entity';
import { HoldemRoundInfo } from '../../domains/game/entities/holdem-round-info.entity';
import { Partner } from '../../domains/game/entities/partner.entity';
import { User } from '../../domains/game/entities/user.entity';
import { MinigameRound } from '../../domains/game/entities/minigame-round.entity';
import { MinigameList } from '../../domains/game/entities/minigame-list.entity';
import { GameConfig } from '../../domains/game/entities/game-config.entity';
import { TransactionLog } from '../../domains/game/entities/transaction-log.entity';
import { PowerballRoundService } from '../../domains/game/services/powerball-round.service';
import { Powerball3RoundService } from '../../domains/game/services/powerball3-round.service';
import { Powerball5RoundService } from '../../domains/game/services/powerball5-round.service';
import { PowerladderRoundService } from '../../domains/game/services/powerladder-round.service';
import { Powerladder3RoundService } from '../../domains/game/services/powerladder3-round.service';
import { Powerladder5RoundService } from '../../domains/game/services/powerladder5-round.service';
import { Rball56RoundService } from '../../domains/game/services/rball56-round.service';
import { Runningball54RoundService } from '../../domains/game/services/runningball54-round.service';
import { Runningball3RoundService } from '../../domains/game/services/runningball3-round.service';
import { Space8RoundService } from '../../domains/game/services/space8-round.service';
import { HoldemRoundService } from '../../domains/game/services/holdem-round.service';
import { MinigameRoundService } from '../../domains/game/services/minigame-round.service';
import { GameConfigService } from '../../domains/game/services/game-config.service';
import { QueueService } from './queue.service';
// import { GameModule } from '../../domains/game/game.module';
// RedisModule is already imported

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context}] ${level}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/queue-worker.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    CqrsModule, // Add CqrsModule for EventBus
    LoggerModule,
    RedisModule, // Add RedisModule for MinigameGateway
    SocketModule, // Add SocketModule for SocketService
    TypeOrmModule.forFeature([
      Transaction,
      PowerballRoundInfo,
      Powerball3RoundInfo,
      Powerball5RoundInfo,
      PowerladderRoundInfo,
      Powerladder3RoundInfo,
      Powerladder5RoundInfo,
      Rball56RoundInfo,
      Runningball54RoundInfo,
      Runningball3RoundInfo,
      Space8RoundInfo,
      HoldemRoundInfo,
      Partner,
      User,
      MinigameRound,
      MinigameList,
      GameConfig,
      TransactionLog,
    ]),
    // RedisModule is already imported for cross-process communication
    // GameModule, // Import GameModule to get PowerballRoundService and MinigameRoundService
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          password: configService.get('REDIS_PASSWORD'),
          db: 0,
        };

        return {
          connection: redisConfig,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { 
        name: 'minigame-socket-data-handle',
        defaultJobOptions: {
          removeOnComplete: 0, // Don't keep successful jobs
          removeOnFail: 5,     // Keep 5 failed jobs
        }
      },
      { 
        name: 'notification',
        defaultJobOptions: {
          removeOnComplete: 0, // Don't keep successful jobs
          removeOnFail: 5,     // Keep 5 failed jobs
        }
      },
      { 
        name: 'betting-result',
        defaultJobOptions: {
          removeOnComplete: 0, // Don't keep successful jobs
          removeOnFail: 5,     // Keep 5 failed jobs
        }
      },
    ),
  ],
  providers: [
    NotificationProcessor,
    MinigameSocketDataProcessor,
    BettingResultProcessor,
    PowerballRoundService,
    Powerball3RoundService,
    Powerball5RoundService,
    PowerladderRoundService,
    Powerladder3RoundService,
    Powerladder5RoundService,
    Rball56RoundService,
    Runningball54RoundService,
    Runningball3RoundService,
    Space8RoundService,
    HoldemRoundService,
    MinigameRoundService,
    GameConfigService,
    QueueService,
  ],
  exports: [
    BullModule,
    NotificationProcessor,
    MinigameSocketDataProcessor,
    BettingResultProcessor,
  ],
})
export class QueueWorkerModule {}
