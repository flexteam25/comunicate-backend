import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteReviewStatisticsRepository } from '../../infrastructure/persistence/repositories/site-review-statistics.repository';
import {
  SiteReviewStatistics,
  SiteReviewStatisticsType,
} from '../../domain/entities/site-review-statistics.entity';
import { SiteReview } from '../../domain/entities/site-review.entity';
import { CalculateSiteReviewStatisticsUseCase } from './calculate-site-review-statistics.use-case';

export interface CalculateSiteReviewStatisticsForDatesCommand {
  siteId: string;
  dates: string[]; // Array of YYYY-MM-DD dates
}

@Injectable()
export class CalculateSiteReviewStatisticsForDatesUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteReviewStatisticsRepository')
    private readonly statisticsRepository: ISiteReviewStatisticsRepository,
    private readonly calculateStatisticsUseCase: CalculateSiteReviewStatisticsUseCase,
  ) {}

  /**
   * Format date string YYYY-MM-DD to Date object
   */
  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Get today's date in timezone +9 format (YYYY-MM-DD)
   */
  private getTodayDate(): string {
    const now = new Date();
    const koreaDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const year = koreaDate.getUTCFullYear();
    const month = String(koreaDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(koreaDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate statistics for a site with multiple dates
   * - Calculate daily statistics for each date
   * - If dates include dates other than today, recalculate total (up to yesterday, timezone +9)
   * - Calculate temp = today + total
   */
  async execute(
    command: CalculateSiteReviewStatisticsForDatesCommand,
  ): Promise<void> {
    const { siteId, dates } = command;
    const todayDate = this.getTodayDate();

    // Get today's dates and other dates separately
    const todayDates = dates.filter((d) => d === todayDate);
    const otherDates = dates.filter((d) => d !== todayDate);

    // 1. Calculate daily statistics for each date
    for (const dateStr of dates) {
      const date = this.parseDate(dateStr);
      await this.calculateStatisticsUseCase.execute({
        siteId,
        type: SiteReviewStatisticsType.DAILY,
        statisticDate: date,
      });
    }

    // 2. If there are dates other than today, recalculate total (up to yesterday, timezone +9)
    if (otherDates.length > 0) {
      // Recalculate total statistics (up to yesterday)
      await this.calculateStatisticsUseCase.execute({
        siteId,
        type: SiteReviewStatisticsType.TOTAL,
      });
    }

    // 3. Always calculate temp = today + total (for real-time display)
    // Calculate temp by querying all reviews up to now (including today)
    const repository = this.siteReviewRepository.getRepository();

    // Query all published reviews up to now (including today, timezone +9)
    const now = new Date();
    const koreaNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    koreaNow.setUTCHours(23, 59, 59, 999);
    const endDate = new Date(koreaNow.getTime() - 9 * 60 * 60 * 1000);
    const startDate = new Date(0);

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

    const rawResult = await queryBuilder.getRawOne();
    const tempResult = rawResult as {
      averageRating?: string | number;
      averageOdds?: string | number;
      averageLimit?: string | number;
      averageEvent?: string | number;
      averageSpeed?: string | number;
      likeCount?: string | number;
      dislikeCount?: string | number;
      commentCount?: string | number;
    } | null;

    const tempStats: Partial<SiteReviewStatistics> = {
      siteId,
      type: SiteReviewStatisticsType.TEMP,
      statisticDate: undefined,
      averageRating: tempResult?.averageRating
        ? parseFloat(String(tempResult.averageRating))
        : 0,
      averageOdds: tempResult?.averageOdds
        ? parseFloat(String(tempResult.averageOdds))
        : 0,
      averageLimit: tempResult?.averageLimit
        ? parseFloat(String(tempResult.averageLimit))
        : 0,
      averageEvent: tempResult?.averageEvent
        ? parseFloat(String(tempResult.averageEvent))
        : 0,
      averageSpeed: tempResult?.averageSpeed
        ? parseFloat(String(tempResult.averageSpeed))
        : 0,
      likeCount: parseInt(String(tempResult?.likeCount || '0'), 10),
      dislikeCount: parseInt(String(tempResult?.dislikeCount || '0'), 10),
      commentCount: parseInt(String(tempResult?.commentCount || '0'), 10),
    };

    await this.statisticsRepository.createOrUpdate(tempStats);
  }
}
