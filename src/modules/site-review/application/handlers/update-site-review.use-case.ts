import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { SiteReview } from '../../domain/entities/site-review.entity';
import { SiteReviewImage } from '../../domain/entities/site-review-image.entity';
import { TransactionService } from '../../../../shared/services/transaction.service';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface UpdateSiteReviewCommand {
  reviewId: string;
  userId: string;
  rating?: number;
  odds?: number;
  limit?: number;
  event?: number;
  speed?: number;
  content?: string;
  imageUrl?: string;
}

@Injectable()
export class UpdateSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateSiteReviewCommand): Promise<SiteReview> {
    const review = await this.siteReviewRepository.findById(command.reviewId, [
      'user',
      'images',
      'user.userBadges',
      'user.userBadges.badge',
    ]);

    if (!review) {
      throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND);
    }

    if (review.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_UPDATE_OWN_REVIEWS);
    }

    // Check 2-hour time limit
    const now = new Date();
    const createdAt = new Date(review.createdAt);
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const timeDiff = now.getTime() - createdAt.getTime();

    if (timeDiff > twoHoursInMs) {
      throw forbidden(MessageKeys.CAN_ONLY_UPDATE_REVIEWS_WITHIN_TWO_HOURS);
    }

    return this.transactionService
      .executeInTransaction(async (manager: EntityManager) => {
        const reviewRepo = manager.getRepository(SiteReview);
        const imageRepo = manager.getRepository(SiteReviewImage);

        // If review was published, set to unpublished (requires re-approval)
        const updateData: Partial<SiteReview> = {};
        if (command.rating !== undefined) updateData.rating = command.rating;
        if (command.odds !== undefined) updateData.odds = command.odds;
        if (command.limit !== undefined) updateData.limit = command.limit;
        if (command.event !== undefined) updateData.event = command.event;
        if (command.speed !== undefined) updateData.speed = command.speed;
        if (command.content !== undefined) updateData.content = command.content;

        if (review.isPublished) {
          updateData.isPublished = false;
        }

        await reviewRepo.update(command.reviewId, updateData);

        // Handle image update (only 1 image allowed)
        if (command.imageUrl !== undefined) {
          // Delete existing images
          await imageRepo.delete({ siteReviewId: command.reviewId });

          // Create new image if provided
          if (command.imageUrl) {
            const image = imageRepo.create({
              siteReviewId: command.reviewId,
              imageUrl: command.imageUrl,
              order: 0,
            });
            await imageRepo.save(image);
          }
        }

        // Reload with relations
        const reloaded = await reviewRepo.findOne({
          where: { id: command.reviewId },
          relations: ['user', 'site', 'images'],
        });

        if (!reloaded) {
          throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND_AFTER_UPDATE);
        }

        return reloaded;
      })
      .then(async (updatedReview) => {
        // Recalculate site statistics
        const reviewRepoImpl = this.siteReviewRepository as any;
        if (reviewRepoImpl.recalculateSiteStatistics) {
          await reviewRepoImpl.recalculateSiteStatistics(updatedReview.siteId);
        }
        return updatedReview;
      });
  }
}
