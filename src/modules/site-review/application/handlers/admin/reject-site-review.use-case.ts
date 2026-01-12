import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../../infrastructure/persistence/repositories/site-review.repository';
import { SiteReview } from '../../../domain/entities/site-review.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RejectSiteReviewCommand {
  reviewId: string;
}

@Injectable()
export class RejectSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(command: RejectSiteReviewCommand): Promise<SiteReview> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND);
    }

    if (!review.isPublished) {
      throw badRequest(MessageKeys.SITE_REVIEW_NOT_APPROVED);
    }

    await this.siteReviewRepository.update(command.reviewId, {
      isPublished: false,
    });

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
      throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND_AFTER_UPDATE);
    }

    return reloaded;
  }
}
