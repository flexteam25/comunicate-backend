import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailJobData } from './processors/email.processor';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email')
    private emailQueue: Queue<EmailJobData>,
  ) {}

  async addEmailJob(data: EmailJobData): Promise<void> {
    await this.emailQueue.add('send-email', data, {
      removeOnComplete: 10,
      removeOnFail: 20,
    });
  }
}
