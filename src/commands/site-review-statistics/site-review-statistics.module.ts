import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { SiteReviewStatisticsDailyCommand } from './site-review-statistics-daily.command';
import { SiteReviewStatisticsTotalCommand } from './site-review-statistics-total.command';
import { LoggerModule } from '../../shared/logger/logger.module';
import { SiteReviewModule } from '../../modules/site-review/site-review.module';
import { SiteReviewStatistics } from '../../modules/site-review/domain/entities/site-review-statistics.entity';
import { SiteReview } from '../../modules/site-review/domain/entities/site-review.entity';
import { SiteReviewReaction } from '../../modules/site-review/domain/entities/site-review-reaction.entity';
import { SiteReviewComment } from '../../modules/site-review/domain/entities/site-review-comment.entity';
import { SiteReviewImage } from '../../modules/site-review/domain/entities/site-review-image.entity';

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
          filename: 'logs/site-review-statistics.log',
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
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [
        SiteReview,
        SiteReviewReaction,
        SiteReviewComment,
        SiteReviewImage,
        SiteReviewStatistics,
      ],
      synchronize: false,
      logging: false,
    }),
    SiteReviewModule,
  ],
  providers: [
    SiteReviewStatisticsDailyCommand,
    SiteReviewStatisticsTotalCommand,
  ],
})
export class SiteReviewStatisticsCommandModule {}

