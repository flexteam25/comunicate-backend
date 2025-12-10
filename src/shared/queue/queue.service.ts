import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface NotificationJobData {
  userId: string;
  type: string;
  message: string;
  data?: any;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('notification')
    private notificationQueue: Queue<NotificationJobData>,
  ) {}

  async addNotificationJob(data: NotificationJobData): Promise<void> {
    await this.notificationQueue.add('send-notification', data, {
      removeOnComplete: 10,
      removeOnFail: 20,
    });
  }
}
