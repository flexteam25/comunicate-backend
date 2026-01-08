import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';

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
  }> {
    // Validate site exists (support both UUID and slug)
    const site = await this.siteRepository.findByIdOrSlug(command.siteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Get statistics using actual site UUID
    const statistics = await this.siteReviewRepository.getStatistics(site.id);

    return {
      siteId: site.id, // Return actual UUID, not the identifier passed in
      ...statistics,
    };
  }
}
