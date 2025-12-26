import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../shared/logger/logger.service';
import { CalculateSiteReviewStatisticsUseCase } from '../../modules/site-review/application/handlers/calculate-site-review-statistics.use-case';
import { SiteReviewStatisticsType } from '../../modules/site-review/domain/entities/site-review-statistics.entity';

interface CliOptions {
  sites?: string; // Format: uuid,uuid,uuid
}

@Command({
  name: 'site-review-statistics-total',
  description: 'Calculate total site review statistics up to yesterday (timezone +9) for specified sites',
})
@Injectable()
export class SiteReviewStatisticsTotalCommand extends CommandRunner {
  constructor(
    private readonly logger: LoggerService,
    private readonly calculateStatisticsUseCase: CalculateSiteReviewStatisticsUseCase,
  ) {
    super();
  }

  async run(passedParams: string[], options?: CliOptions): Promise<void> {
    try {
      if (!options?.sites) {
        this.logger.error('sites is required (format: uuid,uuid,uuid)', null, 'site-review-statistics-total');
        process.exit(1);
      }

      // Parse site IDs
      const siteIds = options.sites.split(',').map((id) => id.trim()).filter((id) => id.length > 0);

      if (siteIds.length === 0) {
        this.logger.error('No valid site IDs provided', null, 'site-review-statistics-total');
        process.exit(1);
      }

      this.logger.info(
        `Calculating total statistics for ${siteIds.length} sites (up to yesterday, timezone +9)`,
        null,
        'site-review-statistics-total',
      );

      // Calculate statistics for each site
      let successCount = 0;
      let errorCount = 0;

      for (const siteId of siteIds) {
        try {
          await this.calculateStatisticsUseCase.execute({
            siteId,
            type: SiteReviewStatisticsType.TOTAL,
            // statisticDate is undefined for total type
          });
          successCount++;
          this.logger.info(
            `✓ Calculated total statistics for site ${siteId}`,
            null,
            'site-review-statistics-total',
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `✗ Failed to calculate statistics for site ${siteId}: ${(error as Error).message}`,
            null,
            'site-review-statistics-total',
          );
        }
      }

      this.logger.info(
        `Completed: ${successCount} successful, ${errorCount} failed`,
        null,
        'site-review-statistics-total',
      );
    } catch (error) {
      this.logger.error(
        `Command failed: ${(error as Error).message}`,
        (error as Error).stack,
        'site-review-statistics-total',
      );
      process.exit(1);
    }
  }

  @Option({
    flags: '-s, --sites <sites>',
    description: 'Comma-separated list of site UUIDs',
  })
  parseSites(val: string): string {
    return val;
  }
}

