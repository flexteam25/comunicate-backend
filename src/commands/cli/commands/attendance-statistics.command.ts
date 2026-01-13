import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ICommand } from '../base-command.interface';
import { AttendanceStatisticsJobData } from '../../../modules/attendance/infrastructure/queue/attendance-statistics.processor';
import { LoggerService } from '../../../shared/logger/logger.service';

@Injectable()
export class AttendanceStatisticsCommand implements ICommand {
  signature = 'attendance-statistics';
  description = 'Trigger attendance statistics calculation job';

  constructor(
    @InjectQueue('attendance-statistics')
    private readonly attendanceStatisticsQueue: Queue<AttendanceStatisticsJobData>,
    private readonly logger: LoggerService,
  ) {}

  async handle(_args: string[], _options?: Record<string, unknown>): Promise<void> {
    try {
      this.logger.info(
        'Triggering attendance statistics calculation job...',
        null,
        'cli',
      );

      const job = await this.attendanceStatisticsQueue.add(
        'calculate-statistics',
        {
          timestamp: new Date().toISOString(),
        },
        {
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      );

      this.logger.info(
        `Attendance statistics job added successfully`,
        {
          jobId: job.id,
          timestamp: new Date().toISOString(),
        },
        'cli',
      );

      console.log(`✅ Job added successfully! Job ID: ${job.id}`);
      console.log(`📊 The job will be processed by the queue worker.`);
      console.log(`💡 Make sure the queue worker is running to process this job.`);
    } catch (error) {
      this.logger.error(
        'Failed to trigger attendance statistics job',
        {
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'cli',
      );

      console.error(`❌ Failed to trigger job: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}
