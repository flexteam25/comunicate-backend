import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { CalculateSiteReviewStatisticsForDatesUseCase } from '../../application/handlers/calculate-site-review-statistics-for-dates.use-case';

export interface SiteReviewStatisticsJobData {
  siteId: string;
  dates: string[]; // Array of YYYY-MM-DD dates
}

@Processor('site-review-statistics')
@Injectable()
export class SiteReviewStatisticsProcessor extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly calculateStatisticsForDatesUseCase: CalculateSiteReviewStatisticsForDatesUseCase,
  ) {
    super();
  }

  async process(job: Job<SiteReviewStatisticsJobData>): Promise<any> {
    try {
      const { siteId, dates } = job.data;

      await this.calculateStatisticsForDatesUseCase.execute({
        siteId,
        dates,
      });

      return {
        success: true,
        jobId: job.id,
        siteId,
        dates,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Site review statistics job ${job.id} failed`,
        {
          jobId: job.id,
          siteId: job.data.siteId,
          dates: job.data.dates,
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'site-review-statistics-queue',
      );
      throw error;
    }
  }
}

