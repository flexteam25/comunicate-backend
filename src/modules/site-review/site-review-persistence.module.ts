import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteReview } from './domain/entities/site-review.entity';
import { SiteReviewReaction } from './domain/entities/site-review-reaction.entity';
import { SiteReviewComment } from './domain/entities/site-review-comment.entity';
import { SiteReviewRepository } from './infrastructure/persistence/typeorm/site-review.repository';
import { SiteReviewReactionRepository } from './infrastructure/persistence/typeorm/site-review-reaction.repository';
import { SiteReviewCommentRepository } from './infrastructure/persistence/typeorm/site-review-comment.repository';
import { SitePersistenceModule } from '../site/site-persistence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SiteReview, SiteReviewReaction, SiteReviewComment]),
    forwardRef(() => SitePersistenceModule),
  ],
  exports: [
    TypeOrmModule,
    'ISiteReviewRepository',
    'ISiteReviewReactionRepository',
    'ISiteReviewCommentRepository',
    SiteReviewRepository,
    SiteReviewReactionRepository,
    SiteReviewCommentRepository,
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
    SiteReviewRepository,
    SiteReviewReactionRepository,
    SiteReviewCommentRepository,
  ],
})
export class SiteReviewPersistenceModule {}
