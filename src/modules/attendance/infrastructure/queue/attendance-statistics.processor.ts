import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { CalculateAttendanceStatisticsUseCase } from '../../application/handlers/calculate-attendance-statistics.use-case';

export interface AttendanceStatisticsJobData {
  timestamp: string;
}

@Processor('attendance-statistics')
@Injectable()
export class AttendanceStatisticsProcessor extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly calculateStatisticsUseCase: CalculateAttendanceStatisticsUseCase,
  ) {
    super();
  }

  async process(job: Job<AttendanceStatisticsJobData>): Promise<any> {
    try {
      await this.calculateStatisticsUseCase.execute();

      return {
        success: true,
        jobId: job.id,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Attendance statistics job ${job.id} failed`,
        {
          jobId: job.id,
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'attendance-statistics-queue',
      );
      throw error;
    }
  }
}
