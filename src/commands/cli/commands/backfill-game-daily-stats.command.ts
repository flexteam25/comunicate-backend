import { Injectable } from '@nestjs/common';
import { ICommand } from '../base-command.interface';
import { GameDailyStatsRepository } from '../../../modules/minigame/infrastructure/persistence/typeorm/game-daily-stats.repository';
import { LoggerService } from '../../../shared/logger/logger.service';

@Injectable()
export class BackfillGameDailyStatsCommand implements ICommand {
  signature = 'backfill-game-daily-stats';
  description =
    'Backfill game_daily_stats for a specific date or date range (optionally for a single user)';

  constructor(
    private readonly gameDailyStatsRepository: GameDailyStatsRepository,
    private readonly logger: LoggerService,
  ) {}

  async handle(args: string[], options?: Record<string, unknown>): Promise<void> {
    const dateOpt = (options?.date as string) || args[0];
    const startDateOpt = (options?.startDate as string) || args[0];
    const endDateOpt = (options?.endDate as string) || args[1];
    const userId = (options?.userId as string) || (options?.user as string) || '';

    if (!dateOpt && (!startDateOpt || !endDateOpt)) {
      console.error('❌ Error: date or (startDate & endDate) is required');
      console.log('\nUsage:');
      console.log('  # Backfill a single day (all users)');
      console.log('  npm run cli:dev -- backfill-game-daily-stats --date=2026-02-27');
      console.log('  npm run cli -- backfill-game-daily-stats --date=2026-02-27');
      console.log('');
      console.log('  # Backfill a date range (all users)');
      console.log(
        '  npm run cli:dev -- backfill-game-daily-stats --startDate=2026-02-01 --endDate=2026-02-07',
      );
      console.log(
        '  npm run cli -- backfill-game-daily-stats --startDate=2026-02-01 --endDate=2026-02-07',
      );
      console.log('');
      console.log('  # Backfill a single user in a date range');
      console.log(
        '  npm run cli:dev -- backfill-game-daily-stats --startDate=2026-02-01 --endDate=2026-02-07 --userId=<user-id>',
      );
      console.log(
        '  npm run cli -- backfill-game-daily-stats --startDate=2026-02-01 --endDate=2026-02-07 --userId=<user-id>',
      );
      process.exit(1);
    }

    try {
      if (dateOpt) {
        const date = this.parseDateOrExit(dateOpt);
        await this.backfillForDate(date, userId || undefined);
      } else {
        const startDate = this.parseDateOrExit(startDateOpt);
        const endDate = this.parseDateOrExit(endDateOpt);

        if (endDate < startDate) {
          console.error('❌ Error: endDate must be >= startDate');
          process.exit(1);
        }

        let current = new Date(startDate);
        while (current <= endDate) {
          await this.backfillForDate(current, userId || undefined);
          // next day (UTC-safe by constructing a new Date.UTC)
          current = new Date(
            Date.UTC(
              current.getUTCFullYear(),
              current.getUTCMonth(),
              current.getUTCDate() + 1,
            ),
          );
        }
      }

      console.log('✅ Backfill completed successfully');
    } catch (error) {
      this.logger.error(
        'Failed to backfill game_daily_stats',
        {
          date: dateOpt,
          startDate: startDateOpt,
          endDate: endDateOpt,
          userId: userId || undefined,
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'cli',
      );
      console.error(
        `❌ Failed to backfill game_daily_stats: ${(error as Error).message}`,
      );
      process.exit(1);
    }
  }

  /**
   * Parse a YYYY-MM-DD string as a UTC calendar day.
   *
   * Important: this is intentionally timezone-agnostic. Whatever date
   * you pass on the CLI is treated as a UTC day boundary, not converted
   * from the local machine timezone.
   */
  private parseDateOrExit(dateStr: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);

    if (!match) {
      console.error(`❌ Error: invalid date "${dateStr}", expected format YYYY-MM-DD`);
      process.exit(1);
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1; // JS months are 0-based
    const day = Number(match[3]);

    return new Date(Date.UTC(year, month, day));
  }

  private async backfillForDate(date: Date, userId?: string): Promise<void> {
    const dateLabel = date.toISOString().slice(0, 10);
    const rows = await this.gameDailyStatsRepository.aggregateForDate(
      date,
      userId ? [userId] : undefined,
    );
    await this.gameDailyStatsRepository.upsertRows(rows);

    this.logger.info(
      'Backfilled game_daily_stats',
      {
        date: dateLabel,
        userId: userId || null,
        rowCount: rows.length,
      },
      'BackfillGameDailyStatsCommand',
    );
  }
}
