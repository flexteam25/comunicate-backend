import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          password: configService.get('REDIS_PASSWORD'),
          db: parseInt(configService.get('REDIS_DB', '0')),
        };
        
        return {
          connection: redisConfig,
        };
      },
      inject: [ConfigService],
    }),
    // Only register queues for adding jobs, NO processors
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
  providers: [QueueService],
  exports: [QueueService], // Only export QueueService, not BullModule
})
export class QueueClientModule {}
