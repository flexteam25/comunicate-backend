import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteReviewStatisticsRepository } from '../../infrastructure/persistence/repositories/site-review-statistics.repository';
import {
  SiteReviewStatistics,
  SiteReviewStatisticsType,
} from '../../domain/entities/site-review-statistics.entity';
import { SiteReview } from '../../domain/entities/site-review.entity';

export interface CalculateSiteReviewStatisticsCommand {
  siteId: string;
  type: SiteReviewStatisticsType;
  statisticDate?: Date; // For daily type, this is the date to calculate. For total, this is undefined
}

@Injectable()
export class CalculateSiteReviewStatisticsUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteReviewStatisticsRepository')
    private readonly statisticsRepository: ISiteReviewStatisticsRepository,
  ) {}

  async execute(
    command: CalculateSiteReviewStatisticsCommand,
  ): Promise<SiteReviewStatistics> {
    const { siteId, type, statisticDate } = command;

    // Build date range for query
    let startDate: Date;
    let endDate: Date;

    if (type === SiteReviewStatisticsType.DAILY && statisticDate) {
      // For daily: calculate statistics for the specific date (timezone +9)
      // Convert timezone +9 date to UTC
      const dateStr = statisticDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const [year, month, day] = dateStr.split('-').map(Number);

      // Create date in timezone +9 (Asia/Seoul)
      const koreaDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      // Subtract 9 hours to get UTC start
      startDate = new Date(koreaDate.getTime() - 9 * 60 * 60 * 1000);
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    } else if (type === SiteReviewStatisticsType.TOTAL) {
      // For total: calculate all published reviews up to yesterday (timezone +9)
      const now = new Date();
      // Get yesterday in timezone +9
      const koreaNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      koreaNow.setUTCDate(koreaNow.getUTCDate() - 1);
      koreaNow.setUTCHours(23, 59, 59, 999);

      // Convert back to UTC
      endDate = new Date(koreaNow.getTime() - 9 * 60 * 60 * 1000);
      startDate = new Date(0); // From beginning
    } else {
      throw new Error('Invalid type or missing statisticDate for daily type');
    }

    // Query published reviews within date range
    // Access repository through the getRepository method
    const repositoryImpl = this.siteReviewRepository as {
      getRepository?: () => Repository<SiteReview>;
    };

    if (!repositoryImpl.getRepository) {
      throw new Error('SiteReviewRepository getRepository method not available');
    }

    const repository = repositoryImpl.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('review')
      .leftJoin(
        'site_review_reactions',
        'likeReaction',
        "likeReaction.review_id = review.id AND likeReaction.reaction_type = 'like'",
      )
      .leftJoin(
        'site_review_reactions',
        'dislikeReaction',
        "dislikeReaction.review_id = review.id AND dislikeReaction.reaction_type = 'dislike'",
      )
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('AVG(review.odds)', 'averageOdds')
      .addSelect('AVG(review.limit)', 'averageLimit')
      .addSelect('AVG(review.event)', 'averageEvent')
      .addSelect('AVG(review.speed)', 'averageSpeed')
      .addSelect('COUNT(DISTINCT likeReaction.id)', 'likeCount')
      .addSelect('COUNT(DISTINCT dislikeReaction.id)', 'dislikeCount')
      .addSelect(
        `(SELECT COUNT(*) FROM site_review_comments WHERE review_id = review.id AND deleted_at IS NULL)`,
        'commentCount',
      )
      .where('review.siteId = :siteId', { siteId })
      .andWhere('review.isPublished = :isPublished', { isPublished: true })
      .andWhere('review.deletedAt IS NULL')
      .andWhere('review.createdAt >= :startDate', { startDate })
      .andWhere('review.createdAt <= :endDate', { endDate });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rawResult = await queryBuilder.getRawOne();
    const result = rawResult as {
      averageRating?: string | number;
      averageOdds?: string | number;
      averageLimit?: string | number;
      averageEvent?: string | number;
      averageSpeed?: string | number;
      likeCount?: string | number;
      dislikeCount?: string | number;
      commentCount?: string | number;
    } | null;

    const statistics: Partial<SiteReviewStatistics> = {
      siteId,
      type,
      statisticDate: type === SiteReviewStatisticsType.DAILY ? statisticDate : undefined,
      averageRating: result?.averageRating ? parseFloat(String(result.averageRating)) : 0,
      averageOdds: result?.averageOdds ? parseFloat(String(result.averageOdds)) : 0,
      averageLimit: result?.averageLimit ? parseFloat(String(result.averageLimit)) : 0,
      averageEvent: result?.averageEvent ? parseFloat(String(result.averageEvent)) : 0,
      averageSpeed: result?.averageSpeed ? parseFloat(String(result.averageSpeed)) : 0,
      likeCount: parseInt(String(result?.likeCount || '0'), 10),
      dislikeCount: parseInt(String(result?.dislikeCount || '0'), 10),
      commentCount: parseInt(String(result?.commentCount || '0'), 10),
    };

    return this.statisticsRepository.createOrUpdate(statistics);
  }
}
