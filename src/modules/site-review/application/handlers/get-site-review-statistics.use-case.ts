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
    // Validate site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Get statistics
    const statistics = await this.siteReviewRepository.getStatistics(command.siteId);

    return {
      siteId: command.siteId,
      ...statistics,
    };
  }
}
