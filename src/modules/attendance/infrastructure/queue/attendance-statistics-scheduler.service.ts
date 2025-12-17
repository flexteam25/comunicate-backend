import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AttendanceStatisticsJobData } from './attendance-statistics.processor';

@Injectable()
export class AttendanceStatisticsSchedulerService {
  private readonly logger = new Logger(AttendanceStatisticsSchedulerService.name);

  constructor(
    @InjectQueue('attendance-statistics')
    private readonly attendanceStatisticsQueue: Queue<AttendanceStatisticsJobData>,
  ) {}

  /**
   * Cron job: runs every 15 minutes
   * Dispatches a job to BullMQ queue, which will be processed by AttendanceStatisticsProcessor
   */
  @Cron('*/15 * * * * *', {
    name: 'calculate-attendance-statistics',
    timeZone: 'UTC',
  })
  async handleCron(): Promise<void> {
    this.logger.log('Attendance statistics cron triggered - dispatching job to queue');

    try {
      await this.attendanceStatisticsQueue.add(
        'calculate-statistics',
        {
          timestamp: new Date().toISOString(),
        },
        {
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      );
      this.logger.log('Attendance statistics job dispatched to queue successfully');
    } catch (error) {
      this.logger.error(
        'Failed to dispatch attendance statistics job',
        (error as Error).stack,
      );
    }
  }
}
