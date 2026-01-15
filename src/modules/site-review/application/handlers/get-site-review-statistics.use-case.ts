import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { notFound, MessageKeys } from '../../../../shared/exceptions/exception-helpers';

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
    highlights: string[];
    enHighlights: string[];
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

    // Generate highlights based on scores >= 4.0
    const highlights: string[] = [];
    const enHighlights: string[] = [];

    if (statistics.averageOdds >= 4.0) {
      highlights.push('타 사이트 대비 좋은 배당을 제공하는 사이트입니다.');
      enHighlights.push('This site provides better odds compared to other sites.');
    }
    if (statistics.averageLimit >= 4.0) {
      highlights.push('높은 상한선을 제공하는 사이트입니다.');
      enHighlights.push('This site provides high limits.');
    }
    if (statistics.averageEvent >= 4.0) {
      highlights.push('유저를 위해 많은 이벤트를 제공하는 사이트입니다.');
      enHighlights.push('This site provides many events for users.');
    }
    if (statistics.averageSpeed >= 4.0) {
      highlights.push('유저에게 친절하며 의사소통이 빠른 사이트입니다.');
      enHighlights.push('This site is user-friendly and has fast communication.');
    }

    return {
      siteId: site.id, // Return actual UUID, not the identifier passed in
      ...statistics,
      topReviews,
      highlights,
      enHighlights,
    };
  }
}
