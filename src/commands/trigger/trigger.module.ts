import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { BullModule } from '@nestjs/bullmq';
import { TriggerCommand } from './trigger.command';
import { LoggerModule } from '../../shared/logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
          filename: 'logs/trigger-cli.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    LoggerModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: parseInt(configService.get<string>('REDIS_DB', '0'), 10),
        };

        return {
          connection: redisConfig,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'attendance-statistics',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 20,
      },
    }),
    // Add more queues here as needed
    // BullModule.registerQueue({
    //   name: 'another-queue',
    //   defaultJobOptions: {
    //     removeOnComplete: 10,
    //     removeOnFail: 20,
    //   },
    // }),
  ],
  providers: [TriggerCommand],
})
export class TriggerCommandModule {}
