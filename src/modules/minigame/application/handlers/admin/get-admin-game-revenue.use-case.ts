import { Inject, Injectable } from '@nestjs/common';
import {
  GameDailyStatsRepository,
  GameRevenueRow,
} from '../../../infrastructure/persistence/typeorm/game-daily-stats.repository';
import {
  AdminGameRevenueResponseDto,
  AdminGameRevenueItemDto,
} from '../../../interface/rest/admin/dto/admin-game-revenue-response.dto';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface GetAdminGameRevenueCommand {
  startDate?: Date;
  endDate?: Date;
  date?: Date;
  gameType?: string;
}

@Injectable()
export class GetAdminGameRevenueUseCase {
  constructor(
    private readonly gameDailyStatsRepository: GameDailyStatsRepository,
    @Inject('IUserRepository') private readonly userRepository: any,
  ) {}

  async execute(
    command: GetAdminGameRevenueCommand = {},
  ): Promise<AdminGameRevenueResponseDto> {
    const { dateFrom, dateTo } = this.resolveDateRange(
      command.date,
      command.startDate,
      command.endDate,
    );

    this.ensureValidRange(dateFrom, dateTo);

    const rows: GameRevenueRow[] = await this.gameDailyStatsRepository.getGameRevenue({
      dateFrom,
      dateTo,
      gameType: command.gameType,
    });

    let items: AdminGameRevenueItemDto[];

    if (command.date) {
      // Single-day mode: keep per-date rows (which will all share the same date).
      items = rows.map((r) => ({
        date: r.date,
        gameType: r.gameType,
        totalBet: r.totalBet,
        totalWin: r.totalWin,
        totalDeduct: r.totalDeduct,
        totalCancel: r.totalCancel,
        netWin: r.netWin,
        roundsPlayed: r.roundsPlayed,
        countWin: r.countWin,
        countLose: r.countLose,
        countDraw: r.countDraw,
        countCancel: r.countCancel,
      }));
    } else {
      // Range mode: sum by gameType over the date range (no per-item date).
      const byGame = new Map<string, AdminGameRevenueItemDto>();

      for (const r of rows) {
        const key = r.gameType;
        const existing = byGame.get(key);
        if (!existing) {
          byGame.set(key, {
            gameType: r.gameType,
            totalBet: r.totalBet,
            totalWin: r.totalWin,
            totalDeduct: r.totalDeduct,
            totalCancel: r.totalCancel,
            netWin: r.netWin,
            roundsPlayed: r.roundsPlayed,
            countWin: r.countWin,
            countLose: r.countLose,
            countDraw: r.countDraw,
            countCancel: r.countCancel,
          });
        } else {
          existing.totalBet += r.totalBet;
          existing.totalWin += r.totalWin;
          existing.totalDeduct += r.totalDeduct;
          existing.totalCancel += r.totalCancel;
          existing.netWin += r.netWin;
          existing.roundsPlayed += r.roundsPlayed;
          existing.countWin += r.countWin;
          existing.countLose += r.countLose;
          existing.countDraw += r.countDraw;
          existing.countCancel += r.countCancel;
        }
      }

      items = Array.from(byGame.values());
    }

    return {
      dateFrom,
      dateTo,
      items,
    };
  }

  private resolveDateRange(
    singleDate?: Date,
    startDate?: Date,
    endDate?: Date,
  ): {
    dateFrom: string;
    dateTo: string;
  } {
    if (singleDate) {
      const day = this.toDateString(singleDate);
      return { dateFrom: day, dateTo: day };
    }

    if (!startDate && !endDate) {
      // Default to "today" in KST using existing helper
      return this.gameDailyStatsRepository.getLeaderboardDateRange('day');
    }

    if (startDate && !endDate) {
      endDate = startDate;
    } else if (!startDate && endDate) {
      startDate = endDate;
    }

    const from = this.toDateString(startDate ?? new Date());
    const to = this.toDateString(endDate ?? new Date());
    return { dateFrom: from, dateTo: to };
  }

  private toDateString(d: Date): string {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(m)}-${pad(day)}`;
  }

  private ensureValidRange(dateFrom: string, dateTo: string): void {
    if (dateFrom > dateTo) {
      throw badRequest(MessageKeys.START_DATE_MUST_BE_BEFORE_END_DATE);
    }

    const start = new Date(`${dateFrom}T00:00:00Z`);
    const end = new Date(`${dateTo}T00:00:00Z`);

    const monthsDiff =
      end.getUTCMonth() -
      start.getUTCMonth() +
      12 * (end.getUTCFullYear() - start.getUTCFullYear());

    if (monthsDiff > 6) {
      throw badRequest(
        (MessageKeys as Record<string, string>).LEADERBOARD_DATE_RANGE_TOO_LARGE,
      );
    }
  }
}
