import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteReview } from '../../domain/entities/site-review.entity';
import { SiteReviewImage } from '../../domain/entities/site-review-image.entity';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import {
  UserComment,
  CommentType,
} from '../../../user/domain/entities/user-comment.entity';

export interface CreateSiteReviewCommand {
  userId: string;
  siteId: string;
  rating: number;
  odds?: number;
  limit?: number;
  event?: number;
  speed?: number;
  content: string;
  imageUrl?: string;
}

@Injectable()
export class CreateSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateSiteReviewCommand): Promise<SiteReview> {
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new BadRequestException('Site not found');
    }

    return this.transactionService
      .executeInTransaction(async (manager: EntityManager) => {
        const reviewRepo = manager.getRepository(SiteReview);
        const imageRepo = manager.getRepository(SiteReviewImage);
        const userCommentRepo = manager.getRepository(UserComment);

        // Check if review exists (upsert pattern)
        const existingReview = await this.siteReviewRepository.findBySiteIdAndUserId(
          site.id,
          command.userId,
        );

        let savedReview: SiteReview;

        if (existingReview) {
          throw new BadRequestException('You have already reviewed this site');
        } else {
          // Create new review
          const review = reviewRepo.create({
            userId: command.userId,
            siteId: command.siteId,
            rating: command.rating,
            odds: command.odds,
            limit: command.limit,
            event: command.event,
            speed: command.speed,
            content: command.content,
            isPublished: true, // Now no need approval
          });
          savedReview = await reviewRepo.save(review);

          // Create image if provided
          if (command.imageUrl) {
            const image = imageRepo.create({
              siteReviewId: savedReview.id,
              imageUrl: command.imageUrl,
              order: 0,
            });
            await imageRepo.save(image);
          }

          // Save to user_comments for statistics
          const userComment = userCommentRepo.create({
            userId: command.userId,
            commentType: CommentType.SITE_REVIEW_COMMENT,
            commentId: savedReview.id,
          });
          await userCommentRepo.save(userComment);
        }

        // Reload with relations within transaction
        const reloaded = await reviewRepo.findOne({
          where: { id: savedReview.id },
          relations: ['user', 'site', 'images'],
        });

        if (!reloaded) {
          throw new Error('Failed to reload site review after creation');
        }

        return reloaded;
      })
      .then(async (review) => {
        // Recalculate site statistics after transaction (only published reviews count)
        const reviewRepoImpl = this.siteReviewRepository as any;
        if (reviewRepoImpl.recalculateSiteStatistics) {
          await reviewRepoImpl.recalculateSiteStatistics(command.siteId);
        }
        return review;
      });
  }
}
