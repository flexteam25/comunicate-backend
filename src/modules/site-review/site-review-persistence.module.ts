import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteReview } from './domain/entities/site-review.entity';
import { SiteReviewReaction } from './domain/entities/site-review-reaction.entity';
import { SiteReviewComment } from './domain/entities/site-review-comment.entity';
import { SiteReviewImage } from './domain/entities/site-review-image.entity';
import { SiteReviewStatistics } from './domain/entities/site-review-statistics.entity';
import { SiteReviewRepository } from './infrastructure/persistence/typeorm/site-review.repository';
import { SiteReviewReactionRepository } from './infrastructure/persistence/typeorm/site-review-reaction.repository';
import { SiteReviewCommentRepository } from './infrastructure/persistence/typeorm/site-review-comment.repository';
import { SiteReviewStatisticsRepository } from './infrastructure/persistence/typeorm/site-review-statistics.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteReview,
      SiteReviewReaction,
      SiteReviewComment,
      SiteReviewImage,
      SiteReviewStatistics,
    ]),
  ],
  exports: [
    TypeOrmModule,
    'ISiteReviewRepository',
    'ISiteReviewReactionRepository',
    'ISiteReviewCommentRepository',
    'ISiteReviewStatisticsRepository',
    SiteReviewRepository,
    SiteReviewReactionRepository,
    SiteReviewCommentRepository,
    SiteReviewStatisticsRepository,
  ],
  providers: [
    {
      provide: 'ISiteReviewRepository',
      useClass: SiteReviewRepository,
    },
    {
      provide: 'ISiteReviewReactionRepository',
      useClass: SiteReviewReactionRepository,
    },
    {
      provide: 'ISiteReviewCommentRepository',
      useClass: SiteReviewCommentRepository,
    },
    {
      provide: 'ISiteReviewStatisticsRepository',
      useClass: SiteReviewStatisticsRepository,
    },
    SiteReviewRepository,
    SiteReviewReactionRepository,
    SiteReviewCommentRepository,
    SiteReviewStatisticsRepository,
  ],
})
export class SiteReviewPersistenceModule {}
