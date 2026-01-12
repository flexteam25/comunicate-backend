import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface GetSiteReviewStatisticsCommand {
  siteId: string;
}

@Injectable()
export class GetSiteReviewStatisticsUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: GetSiteReviewStatisticsCommand): Promise<{
    siteId: string;
    averageRating: number;
    averageOdds: number;
    averageLimit: number;
    averageEvent: number;
    averageSpeed: number;
    reviewCount: number;
    topReviews: string[];
  }> {
    // Validate site exists (support both UUID and slug)
    const site = await this.siteRepository.findByIdOrSlug(command.siteId);
    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Get statistics using actual site UUID
    const statistics = await this.siteReviewRepository.getStatistics(site.id);

    // Get top 5 five-star reviews
    const topReviews = await this.siteReviewRepository.findTopStarReviews(site.id);

    return {
      siteId: site.id, // Return actual UUID, not the identifier passed in
      ...statistics,
      topReviews,
    };
  }
}
