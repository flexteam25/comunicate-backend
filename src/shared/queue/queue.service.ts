import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface MinigameSocketDataJobData {
  provider: string;
  data: any;
  timestamp: number;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  message: string;
  data?: any;
}

export interface BettingResultJobData {
  game: string;
  roundDay: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('minigame-socket-data-handle')
    private minigameSocketDataQueue: Queue<MinigameSocketDataJobData>,
    @InjectQueue('notification')
    private notificationQueue: Queue<NotificationJobData>,
    @InjectQueue('betting-result')
    private bettingResultQueue: Queue<BettingResultJobData>,
  ) {}

  // Minigame Socket Data Queue
  async addMinigameSocketDataJob(
    data: MinigameSocketDataJobData,
  ): Promise<void> {
    await this.minigameSocketDataQueue.add('process-minigame-data', data, {
      removeOnComplete: 10,
      removeOnFail: 20,
    });
  }

  // Notification Queue
  async addNotificationJob(data: NotificationJobData): Promise<void> {
    await this.notificationQueue.add('send-notification', data, {
      removeOnComplete: 10,
      removeOnFail: 20,
    });
  }

  // Betting Result Queue
  async addBettingResultJob(data: BettingResultJobData): Promise<void> {
    await this.bettingResultQueue.add('process-betting-result', data, {
      removeOnComplete: 10,
      removeOnFail: 20,
    });
  }
}
