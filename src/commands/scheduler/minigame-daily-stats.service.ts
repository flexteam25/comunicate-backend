import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  GameDailyStatsRepository,
  GameDailyStatsRow,
} from '../../modules/minigame/infrastructure/persistence/typeorm/game-daily-stats.repository';
import { LoggerService } from '../../shared/logger/logger.service';

/**
 * Scheduler for computing game_daily_stats.
 *
 * Strategy (business timezone = Asia/Seoul, UTC+9):
 * - Every 2 minutes: recompute stats for "today" (KST).
 * - At 00:08 KST (cron based on server time): recompute stats for "yesterday" (KST).
 * - Any further corrections use manual backfill commands/jobs.
 */
@Injectable()
export class MinigameDailyStatsScheduler {
  constructor(
    private readonly gameDailyStatsRepository: GameDailyStatsRepository,
    private readonly logger: LoggerService,
  ) {}

  @Cron('0 */2 * * * *') // every 2 minutes
  // @Cron(CronExpression.EVERY_10_SECONDS)
  async recomputeToday() {
    try {
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const dateLabel = today.toISOString().slice(0, 10);

      const userIds =
        await this.gameDailyStatsRepository.findActiveUserIdsForDate(today);

      if (!userIds.length) {
        return;
      }

      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(userIds.length / BATCH_SIZE);

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        const allRows: GameDailyStatsRow[] =
          await this.gameDailyStatsRepository.aggregateForDate(today, batch);

        if (allRows.length) {
          await this.gameDailyStatsRepository.upsertRows(allRows);
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to recompute game_daily_stats for today',
        {
          error: error instanceof Error ? error.message : String(error),
          stack:
            error instanceof Error
              ? error.stack.split('\n').map((line) => line.trim())
              : undefined,
        },
        'minigame-daily-stats-scheduler',
      );
    }
  }

  /**
   * Finalize yesterday's stats at 00:08 UTC.
   */
  @Cron('8 0 * * *')
  async finalizeYesterday() {
    try {
      const now = new Date();
      const yesterday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
      );
      const dateLabel = yesterday.toISOString().slice(0, 10);

      const userIds =
        await this.gameDailyStatsRepository.findActiveUserIdsForDate(yesterday);

      if (!userIds.length) {
        return;
      }

      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(userIds.length / BATCH_SIZE);

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        const allRows: GameDailyStatsRow[] =
          await this.gameDailyStatsRepository.aggregateForDate(yesterday, batch);

        if (allRows.length) {
          await this.gameDailyStatsRepository.upsertRows(allRows);
        }
      }

      this.logger.info(
        'Finished finalizing game_daily_stats for yesterday',
        {
          date: dateLabel,
          userCount: userIds.length,
          totalBatches,
        },
        'minigame-daily-stats-scheduler',
      );
    } catch (error) {
      this.logger.error(
        'Failed to finalize game_daily_stats for yesterday',
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'minigame-daily-stats-scheduler',
      );
    }
  }
}
