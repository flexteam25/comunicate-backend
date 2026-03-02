import { Inject, Injectable } from '@nestjs/common';
import {
  GameDailyStatsRepository,
  AdminLeaderboardSortBy,
} from '../../../infrastructure/persistence/typeorm/game-daily-stats.repository';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { User } from '../../../../user/domain/entities/user.entity';
import {
  AdminLeaderboardResponseDto,
  AdminLeaderboardItemDto,
  AdminLeaderboardOrderBy,
} from '../../../interface/rest/admin/dto/admin-leaderboard-response.dto';
import { badRequest, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface GetAdminLeaderboardCommand {
  startDate?: Date;
  endDate?: Date;
  sortBy?: AdminLeaderboardSortBy;
  orderBy?: AdminLeaderboardOrderBy;
  limit?: number;
  gameType?: string;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

@Injectable()
export class GetAdminLeaderboardUseCase {
  constructor(
    private readonly gameDailyStatsRepository: GameDailyStatsRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: GetAdminLeaderboardCommand = {}): Promise<AdminLeaderboardResponseDto> {
    const sortBy: AdminLeaderboardSortBy =
      command.sortBy ?? ('win' as AdminLeaderboardSortBy);

    let order: 'ASC' | 'DESC';
    if (command.orderBy) {
      order = command.orderBy.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    } else {
      // Default: win -> DESC (top winners), lose -> ASC (top losers)
      order = sortBy === 'lose' ? 'ASC' : 'DESC';
    }

    const limit = Math.min(Math.max(1, command.limit ?? DEFAULT_LIMIT), MAX_LIMIT);

    const { dateFrom, dateTo } = this.resolveDateRange(command.startDate, command.endDate);

    this.ensureValidRange(dateFrom, dateTo);

    const rows = await this.gameDailyStatsRepository.getAdminLeaderboard({
      dateFrom,
      dateTo,
      sortBy,
      orderBy: order,
      limit,
      gameType: command.gameType,
    });

    const userIds = rows.map((r) => r.userId);
    const users = await this.userRepository.findByIds(userIds);
    const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

    const items: AdminLeaderboardItemDto[] = rows.map((r) => {
      const user = userMap.get(r.userId);
      return {
        user: {
          id: r.userId,
          email: user?.email ?? '',
          displayName: user?.displayName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
        },
        netWin: r.netWin,
        totalBet: r.totalBet,
        totalWin: r.totalWin,
        totalDeduct: r.totalDeduct,
        roundsPlayed: r.roundsPlayed,
        countWin: r.countWin,
        countLose: r.countLose,
        countDraw: r.countDraw,
      };
    });

    return {
      dateFrom,
      dateTo,
      sortBy,
      orderBy: order === 'ASC' ? 'asc' : 'desc',
      items,
    };
  }

  private resolveDateRange(
    startDate?: Date,
    endDate?: Date,
  ): { dateFrom: string; dateTo: string } {
    if (!startDate && !endDate) {
      // Default to "today" in KST using existing helper
      return this.gameDailyStatsRepository.getLeaderboardDateRange('day');
    }

    if (startDate && !endDate) {
      endDate = startDate;
    } else if (!startDate && endDate) {
      startDate = endDate;
    }

    const from = this.toDateString(startDate as Date);
    const to = this.toDateString(endDate as Date);
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
      throw badRequest(MessageKeys.LEADERBOARD_DATE_RANGE_TOO_LARGE);
    }
  }
}
