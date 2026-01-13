import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { BullModule } from '@nestjs/bullmq';
import { CliCommand } from './cli.command';
import { SyncUserPostsCommand } from './commands/sync-user-posts.command';
import { SyncUserCommentsCommand } from './commands/sync-user-comments.command';
import { AttendanceStatisticsCommand } from './commands/attendance-statistics.command';
import { LoggerModule } from '../../shared/logger/logger.module';
import { ALL_ENTITIES } from './entities';
import { UserPost } from '../../modules/user/domain/entities/user-post.entity';
import { Post } from '../../modules/post/domain/entities/post.entity';
import { UserComment } from '../../modules/user/domain/entities/user-comment.entity';
import { PostComment } from '../../modules/post/domain/entities/post-comment.entity';
import { SiteReviewComment } from '../../modules/site-review/domain/entities/site-review-comment.entity';
import { ScamReportComment } from '../../modules/scam-report/domain/entities/scam-report-comment.entity';

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
          filename: 'logs/cli.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    LoggerModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'poca_db',
      entities: ALL_ENTITIES,
      synchronize: false,
      logging: false,
    }),
    TypeOrmModule.forFeature([
      UserPost,
      Post,
      UserComment,
      PostComment,
      SiteReviewComment,
      ScamReportComment,
    ]),
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
  ],
  providers: [
    CliCommand,
    SyncUserPostsCommand,
    SyncUserCommentsCommand,
    AttendanceStatisticsCommand,
  ],
})
export class CliCommandModule {}
