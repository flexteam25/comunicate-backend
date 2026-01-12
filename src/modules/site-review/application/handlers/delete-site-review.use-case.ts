import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface DeleteSiteReviewCommand {
  reviewId: string;
  userId: string;
}

@Injectable()
export class DeleteSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(command: DeleteSiteReviewCommand): Promise<void> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND);
    }

    if (review.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_DELETE_OWN_REVIEWS);
    }

    await this.siteReviewRepository.delete(command.reviewId);

    // Recalculate site statistics (reactions and comments remain, they're fine to keep)
    const reviewRepoImpl = this.siteReviewRepository as any;
    if (reviewRepoImpl.recalculateSiteStatistics) {
      await reviewRepoImpl.recalculateSiteStatistics(review.siteId);
    }
  }
}
