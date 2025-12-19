import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { EmailProcessor } from './processors/email.processor';
import { LoggerModule } from '../logger/logger.module';
import { RedisModule } from '../redis/redis.module';
import { QueueService } from './queue.service';
import { EmailModule } from '../services/email/email.module';
import { AttendanceModule } from '../../modules/attendance/attendance.module';
import { AttendanceStatisticsProcessor } from '../../modules/attendance/infrastructure/queue/attendance-statistics.processor';

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
            winston.format.printf((info) => {
              const { timestamp, level, message, context } = info as {
                timestamp: string;
                level: string;
                message: string;
                context?: string;
              };
              return `${timestamp} [${context || 'App'}] ${level}: ${message}`;
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
    LoggerModule,
    RedisModule,
    EmailModule.forRoot(),
    AttendanceModule, // Import for AttendanceStatisticsProcessor
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
    BullModule.registerQueue(
      {
        name: 'email',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      },
      {
        name: 'attendance-statistics',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      },
    ),
  ],
  providers: [EmailProcessor, AttendanceStatisticsProcessor, QueueService],
  exports: [BullModule, EmailProcessor, AttendanceStatisticsProcessor, QueueService],
})
export class QueueWorkerModule {}
