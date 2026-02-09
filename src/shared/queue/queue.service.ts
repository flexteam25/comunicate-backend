import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailJobData } from './processors/email.processor';
import { GamePointLogJobData } from './processors/game-point-log.processor';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email')
    private emailQueue: Queue<EmailJobData>,
    @InjectQueue('game-point-log')
    private gamePointLogQueue: Queue<GamePointLogJobData>,
  ) {}

  async addEmailJob(data: EmailJobData): Promise<void> {
    await this.emailQueue.add('send-email', data, {
      removeOnComplete: 10,
      removeOnFail: 20,
    });
  }

  /**
   * Queue job to log point transaction & publish POINT_UPDATED
   * for minigame callbacks. All failed jobs are kept for auditing.
   */
  async addGamePointLogJob(data: GamePointLogJobData): Promise<void> {
    await this.gamePointLogQueue.add('game-point-log', data, {
      // Keep failed jobs (also configured at queue level)
      removeOnFail: false,
      removeOnComplete: 10,
    });
  }
}
