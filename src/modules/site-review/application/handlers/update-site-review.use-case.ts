import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { SiteReview } from '../../domain/entities/site-review.entity';

export interface UpdateSiteReviewCommand {
  reviewId: string;
  userId: string;
  rating?: number;
  title?: string;
  content?: string;
}

@Injectable()
export class UpdateSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(command: UpdateSiteReviewCommand): Promise<SiteReview> {
    const review = await this.siteReviewRepository.findById(command.reviewId, ['user']);

    if (!review) {
      throw new NotFoundException('Site review not found');
    }

    if (review.userId !== command.userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Check 2-hour time limit
    const now = new Date();
    const createdAt = new Date(review.createdAt);
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const timeDiff = now.getTime() - createdAt.getTime();

    if (timeDiff > twoHoursInMs) {
      throw new ForbiddenException(
        'Review can only be updated within 2 hours of submission',
      );
    }

    // If review was published, set to unpublished (requires re-approval)
    const updateData: Partial<SiteReview> = {};
    if (command.rating !== undefined) updateData.rating = command.rating;
    if (command.title !== undefined) updateData.title = command.title;
    if (command.content !== undefined) updateData.content = command.content;

    if (review.isPublished) {
      updateData.isPublished = false;
    }

    await this.siteReviewRepository.update(command.reviewId, updateData);

    // Recalculate site statistics
    const reviewRepoImpl = this.siteReviewRepository as any;
    if (reviewRepoImpl.recalculateSiteStatistics) {
      await reviewRepoImpl.recalculateSiteStatistics(review.siteId);
    }

    // Reload with relations
    const reloaded = await this.siteReviewRepository.findById(command.reviewId, [
      'user',
      'site',
    ]);

    if (!reloaded) {
      throw new NotFoundException('Site review not found after update');
    }

    return reloaded;
  }
}
