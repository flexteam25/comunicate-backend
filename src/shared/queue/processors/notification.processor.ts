import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../logger/logger.service';

export interface NotificationJobData {
  userId: string;
  type: string;
  message: string;
  data?: any;
}

@Processor('notification')
@Injectable()
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly logger: LoggerService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    const { userId, type, message, data } = job.data;

    // Simulate notification processing
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      userId,
      type,
      processedAt: new Date().toISOString(),
    };
  }
}
