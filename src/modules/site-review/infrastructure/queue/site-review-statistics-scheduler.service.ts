import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { SchedulerRegistry, Cron } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { SiteReviewStatisticsJobData } from './site-review-statistics.processor';
import { SiteReviewCacheService } from '../cache/site-review-cache.service';
import { CalculateSiteReviewStatisticsUseCase } from '../../application/handlers/calculate-site-review-statistics.use-case';
import { SiteReviewStatisticsType } from '../../domain/entities/site-review-statistics.entity';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';

@Injectable()
export class SiteReviewStatisticsSchedulerService implements OnModuleInit {
  private readonly cronJobName = 'check-site-review-statistics-cache';

  constructor(
    @InjectQueue('site-review-statistics')
    private readonly siteReviewStatisticsQueue: Queue<SiteReviewStatisticsJobData>,
    private readonly siteReviewCacheService: SiteReviewCacheService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly calculateStatisticsUseCase: CalculateSiteReviewStatisticsUseCase,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  onModuleInit() {
    // Get cron expression from env (default: */3 * * * * * for every 3 minutes)
    // Can be a number (minutes) or full cron expression
    const cronExpression = this.configService.get<string>(
      'SITE_REVIEW_STATISTICS_CHECK_INTERVAL',
      '*/3 * * * * *',
    );

    // Convert minutes to cron expression if it's a number
    const finalCronExpression = this.parseCronExpression(cronExpression);

    const job = new CronJob(
      finalCronExpression,
      () => {
        void this.handleCron();
      },
      null,
      true,
      'UTC',
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.schedulerRegistry.addCronJob(this.cronJobName, job);
    this.logger.info(
      `Site review statistics scheduler registered with cron: ${finalCronExpression}`,
      null,
      'site-review-statistics-scheduler',
    );
  }

  /**
   * Parse cron expression - if it's a number (minutes), convert to cron format
   * Otherwise use it as-is
   * Format: second minute hour day month weekday (6 fields)
   */
  private parseCronExpression(expression: string): string {
    // If it's a number (minutes), convert to cron: 0 */N * * * * (every N minutes at second 0)
    const minutes = parseInt(expression, 10);
    if (!isNaN(minutes) && minutes > 0) {
      return `0 */${minutes} * * * *`;
    }
    // Otherwise use as cron expression
    return expression;
  }

  /**
   * Cron job handler: reads siteId->dates map from cache and dispatches one job per siteId
   */
  async handleCron(): Promise<void> {
    try {
      // Get all siteIds with their dates from cache
      const siteDatesMap = await this.siteReviewCacheService.getSiteDatesMap();

      if (siteDatesMap.size === 0) {
        this.logger.debug(
          'No siteIds in cache for statistics calculation',
          null,
          'site-review-statistics-scheduler',
        );
        return;
      }

      this.logger.info(
        `Processing ${siteDatesMap.size} siteIds for statistics calculation`,
        null,
        'site-review-statistics-scheduler',
      );

      // Dispatch one job per siteId with all its dates
      const jobs = Array.from(siteDatesMap.entries()).map(([siteId, dates]) => {
        return this.siteReviewStatisticsQueue.add(
          'calculate-statistics-for-dates',
          {
            siteId,
            dates,
          },
          {
            removeOnComplete: 10,
            removeOnFail: 20,
          },
        );
      });

      await Promise.all(jobs);

      // Remove processed siteIds from cache
      const siteIds = Array.from(siteDatesMap.keys());
      await this.siteReviewCacheService.removeSiteDates(siteIds);

      this.logger.info(
        `Dispatched ${siteIds.length} statistics jobs`,
        null,
        'site-review-statistics-scheduler',
      );
    } catch (error) {
      this.logger.error(
        'Failed to dispatch site review statistics jobs',
        (error as Error).stack,
        'site-review-statistics-scheduler',
      );
    }
  }

  /**
   * Cron job: runs at 00:05 every day (Asia/Seoul timezone) to calculate total statistics
   * This chốt số (closes the day) 5 minutes after midnight
   */
  @Cron('5 0 * * *', {
    name: 'calculate-site-review-total-statistics',
    timeZone: 'Asia/Seoul',
  })
  async handleDailyTotalCalculation(): Promise<void> {
    try {
      this.logger.info(
        'Starting daily total statistics calculation for all sites',
        null,
        'site-review-statistics-scheduler',
      );

      // Get all sites - we'll use findAllWithCursor with a large limit
      const allSitesResult = await this.siteRepository.findAllWithCursor(
        {},
        undefined,
        10000, // Large limit to get all sites
        'createdAt',
        'ASC',
      );

      const siteIds = allSitesResult.data.map((site) => site.id);

      this.logger.info(
        `Calculating total statistics for ${siteIds.length} sites`,
        null,
        'site-review-statistics-scheduler',
      );

      // Calculate total statistics for each site
      for (const siteId of siteIds) {
        try {
          await this.calculateStatisticsUseCase.execute({
            siteId,
            type: SiteReviewStatisticsType.TOTAL,
          });
        } catch (error) {
          this.logger.error(
            `Failed to calculate total statistics for site ${siteId}`,
            (error as Error).stack,
            'site-review-statistics-scheduler',
          );
          // Continue with other sites even if one fails
        }
      }

      this.logger.info(
        `Completed daily total statistics calculation for ${siteIds.length} sites`,
        null,
        'site-review-statistics-scheduler',
      );
    } catch (error) {
      this.logger.error(
        'Failed to calculate daily total statistics',
        (error as Error).stack,
        'site-review-statistics-scheduler',
      );
    }
  }
}
