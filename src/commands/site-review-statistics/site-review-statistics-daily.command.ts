import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../shared/logger/logger.service';
import { CalculateSiteReviewStatisticsUseCase } from '../../modules/site-review/application/handlers/calculate-site-review-statistics.use-case';
import { SiteReviewStatisticsType } from '../../modules/site-review/domain/entities/site-review-statistics.entity';

interface CliOptions {
  dateRange?: string; // Format: 20251101-20251201
  sites?: string; // Format: uuid,uuid,uuid
}

@Command({
  name: 'site-review-statistics-daily',
  description: 'Calculate daily site review statistics for specified date range and sites',
})
@Injectable()
export class SiteReviewStatisticsDailyCommand extends CommandRunner {
  constructor(
    private readonly logger: LoggerService,
    private readonly calculateStatisticsUseCase: CalculateSiteReviewStatisticsUseCase,
  ) {
    super();
  }

  async run(passedParams: string[], options?: CliOptions): Promise<void> {
    try {
      if (!options?.dateRange) {
        this.logger.error('dateRange is required (format: 20251101-20251201)', null, 'site-review-statistics-daily');
        process.exit(1);
      }

      if (!options?.sites) {
        this.logger.error('sites is required (format: uuid,uuid,uuid)', null, 'site-review-statistics-daily');
        process.exit(1);
      }

      // Parse dateRange (format: 20251101-20251201)
      const [startDateStr, endDateStr] = options.dateRange.split('-');
      if (!startDateStr || !endDateStr) {
        this.logger.error('Invalid dateRange format. Expected: YYYYMMDD-YYYYMMDD', null, 'site-review-statistics-daily');
        process.exit(1);
      }

      // Parse dates (timezone +9)
      const startDate = this.parseDate(startDateStr);
      const endDate = this.parseDate(endDateStr);

      if (startDate > endDate) {
        this.logger.error('Start date must be before or equal to end date', null, 'site-review-statistics-daily');
        process.exit(1);
      }

      // Parse site IDs
      const siteIds = options.sites.split(',').map((id) => id.trim()).filter((id) => id.length > 0);

      if (siteIds.length === 0) {
        this.logger.error('No valid site IDs provided', null, 'site-review-statistics-daily');
        process.exit(1);
      }

      this.logger.info(
        `Calculating daily statistics for ${siteIds.length} sites from ${startDateStr} to ${endDateStr}`,
        null,
        'site-review-statistics-daily',
      );

      // Generate all dates in range
      const dates: Date[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate statistics for each site and each date
      let successCount = 0;
      let errorCount = 0;

      for (const siteId of siteIds) {
        for (const date of dates) {
          try {
            await this.calculateStatisticsUseCase.execute({
              siteId,
              type: SiteReviewStatisticsType.DAILY,
              statisticDate: date,
            });
            successCount++;
            this.logger.info(
              `✓ Calculated daily statistics for site ${siteId} on ${date.toISOString().split('T')[0]}`,
              null,
              'site-review-statistics-daily',
            );
          } catch (error) {
            errorCount++;
            this.logger.error(
              `✗ Failed to calculate statistics for site ${siteId} on ${date.toISOString().split('T')[0]}: ${(error as Error).message}`,
              null,
              'site-review-statistics-daily',
            );
          }
        }
      }

      this.logger.info(
        `Completed: ${successCount} successful, ${errorCount} failed`,
        null,
        'site-review-statistics-daily',
      );
    } catch (error) {
      this.logger.error(
        `Command failed: ${(error as Error).message}`,
        (error as Error).stack,
        'site-review-statistics-daily',
      );
      process.exit(1);
    }
  }

  @Option({
    flags: '-d, --dateRange <dateRange>',
    description: 'Date range in format YYYYMMDD-YYYYMMDD (timezone +9)',
  })
  parseDateRange(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --sites <sites>',
    description: 'Comma-separated list of site UUIDs',
  })
  parseSites(val: string): string {
    return val;
  }

  /**
   * Parse date string (YYYYMMDD) in timezone +9 to UTC Date
   */
  private parseDate(dateStr: string): Date {
    if (dateStr.length !== 8) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYYMMDD`);
    }

    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10);
    const day = parseInt(dateStr.substring(6, 8), 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    // Create date in timezone +9 (Asia/Seoul)
    const koreaDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    // Return as UTC date (subtract 9 hours)
    return new Date(koreaDate.getTime() - 9 * 60 * 60 * 1000);
  }
}

