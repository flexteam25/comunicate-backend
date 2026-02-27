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
 * Strategy:
 * - Every 5 minutes: recompute stats for today (UTC).
 * - At 00:08 UTC: recompute stats for yesterday (finalize).
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
      const todayUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const dateLabel = todayUtc.toISOString().slice(0, 10);

      const userIds =
        await this.gameDailyStatsRepository.findActiveUserIdsForDate(todayUtc);

      if (!userIds.length) {
        this.logger.info(
          'No active users with bet_histories for today; skipping recompute',
          { date: dateLabel },
          'minigame-daily-stats-scheduler',
        );
        return;
      }

      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(userIds.length / BATCH_SIZE);

      this.logger.info(
        'Recomputing game_daily_stats for today',
        {
          date: dateLabel,
          userCount: userIds.length,
          batchSize: BATCH_SIZE,
          totalBatches,
        },
        'minigame-daily-stats-scheduler',
      );

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        const allRows: GameDailyStatsRow[] =
          await this.gameDailyStatsRepository.aggregateForDate(todayUtc, batch);

        if (allRows.length) {
          await this.gameDailyStatsRepository.upsertRows(allRows);
        }
      }

      this.logger.info(
        'Finished recomputing game_daily_stats for today',
        {
          date: dateLabel,
          userCount: userIds.length,
          totalBatches,
        },
        'minigame-daily-stats-scheduler',
      );
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
      const yesterdayUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
      );
      const dateLabel = yesterdayUtc.toISOString().slice(0, 10);

      const userIds =
        await this.gameDailyStatsRepository.findActiveUserIdsForDate(yesterdayUtc);

      if (!userIds.length) {
        this.logger.info(
          'No active users with bet_histories for yesterday; skipping finalize',
          { date: dateLabel },
          'minigame-daily-stats-scheduler',
        );
        return;
      }

      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(userIds.length / BATCH_SIZE);

      this.logger.info(
        'Finalizing game_daily_stats for yesterday',
        {
          date: dateLabel,
          userCount: userIds.length,
          batchSize: BATCH_SIZE,
          totalBatches,
        },
        'minigame-daily-stats-scheduler',
      );

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        const allRows: GameDailyStatsRow[] =
          await this.gameDailyStatsRepository.aggregateForDate(yesterdayUtc, batch);

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
