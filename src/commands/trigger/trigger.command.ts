import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AttendanceStatisticsJobData } from '../../modules/attendance/infrastructure/queue/attendance-statistics.processor';
import { LoggerService } from '../../shared/logger/logger.service';

interface TriggerCommandOptions {
  type: string;
}

@Command({
  name: 'trigger',
  description: 'Trigger various jobs and processors',
  subCommands: [],
})
@Injectable()
export class TriggerCommand extends CommandRunner {
  constructor(
    @InjectQueue('attendance-statistics')
    private readonly attendanceStatisticsQueue: Queue<AttendanceStatisticsJobData>,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async run(passedParams: string[], options?: TriggerCommandOptions): Promise<void> {
    const type = options?.type || passedParams[0];

    if (!type) {
      console.error('❌ Error: Job type is required');
      console.log('\nUsage:');
      console.log('  npm run trigger:dev -- --type=attendance-statistics');
      console.log('  npm run trigger -- --type=attendance-statistics');
      console.log('\nAvailable types:');
      console.log('  - attendance-statistics');
      process.exit(1);
    }

    switch (type) {
      case 'attendance-statistics':
        await this.triggerAttendanceStatistics();
        break;
      default:
        console.error(`❌ Error: Unknown job type: ${type}`);
        console.log('\nAvailable types:');
        console.log('  - attendance-statistics');
        process.exit(1);
    }
  }

  @Option({
    flags: '-t, --type <type>',
    description: 'Type of job to trigger',
  })
  parseType(val: string): string {
    return val;
  }

  private async triggerAttendanceStatistics(): Promise<void> {
    try {
      this.logger.info(
        'Triggering attendance statistics calculation job...',
        null,
        'trigger-cli',
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
        'trigger-cli',
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
        'trigger-cli',
      );

      console.error(`❌ Failed to trigger job: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}
