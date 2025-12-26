import { SiteReviewStatistics, SiteReviewStatisticsType } from '../../../domain/entities/site-review-statistics.entity';

export interface ISiteReviewStatisticsRepository {
  findBySiteIdAndType(
    siteId: string,
    type: SiteReviewStatisticsType,
    statisticDate?: Date,
  ): Promise<SiteReviewStatistics | null>;
  createOrUpdate(statistics: Partial<SiteReviewStatistics>): Promise<SiteReviewStatistics>;
  findBySiteIdsAndType(
    siteIds: string[],
    type: SiteReviewStatisticsType,
    statisticDate?: Date,
  ): Promise<SiteReviewStatistics[]>;
}

