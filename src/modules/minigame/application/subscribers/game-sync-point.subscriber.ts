import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../shared/socket/socket-channels';
import { GameBackendClientService } from '../../../../shared/services/game-backend-client.service';
import { LoggerService } from '../../../../shared/logger/logger.service';

interface PointUpdatedEvent {
  userId: string;
  newPoints?: number;
  previousPoints?: number;
  pointsDelta?: number;
  transactionType?: string;
  updatedAt?: Date;
  /** When source is minigame_callback, do not call sync-point (change came from game backend). */
  source?: string;
}

/**
 * Subscribes to Redis POINT_UPDATED and syncs the new point to game backend (management server).
 * Any point change on partner triggers sync so game backend POINT stays in sync.
 */
@Injectable()
export class GameSyncPointSubscriber implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    private readonly gameBackendClient: GameBackendClientService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    if (!this.gameBackendClient.isSyncPointConfigured()) {
      this.logger.warn('Game sync-point not configured, skipping POINT_UPDATED subscriber', {}, 'minigame');
      return;
    }
    await this.redisService.subscribeToChannel(
      RedisChannel.POINT_UPDATED as string,
      (raw: unknown) => this.onPointUpdated(raw),
    );
    this.logger.info('Subscribed to POINT_UPDATED for game sync-point', {}, 'minigame');
  }

  private onPointUpdated(raw: unknown) {
    const data = raw as PointUpdatedEvent;
    if (data?.source === 'minigame_callback') {
      return;
    }
    const userId = data?.userId;
    const newPoints = data?.newPoints;
    if (userId == null || newPoints == null) {
      return;
    }
    const pointNum = Number(newPoints);
    if (Number.isNaN(pointNum) || pointNum < 0) {
      return;
    }
    this.gameBackendClient
      .syncPoint(userId, pointNum)
      .catch((err) => {
        this.logger.error(
          'Failed to sync point to game backend',
          { userId, newPoints: pointNum, error: err instanceof Error ? err.message : String(err) },
          'minigame',
        );
      });
  }
}
