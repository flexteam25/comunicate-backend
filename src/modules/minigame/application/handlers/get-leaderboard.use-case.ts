import { Injectable, Inject } from '@nestjs/common';
import { GameDailyStatsRepository, LeaderboardPeriod } from '../../infrastructure/persistence/typeorm/game-daily-stats.repository';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { User } from '../../../user/domain/entities/user.entity';
import {
  LeaderboardResponseDto,
  LeaderboardUserItemDto,
  LeaderboardPeriodType,
} from '../../interface/rest/dto/leaderboard-response.dto';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 30;

export interface GetLeaderboardCommand {
  type?: LeaderboardPeriodType;
  limit?: number;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    private readonly gameDailyStatsRepository: GameDailyStatsRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: GetLeaderboardCommand = {}): Promise<LeaderboardResponseDto> {
    const type: LeaderboardPeriodType = command.type === 'week' || command.type === 'month' ? command.type : 'day';
    const limit = Math.min(
      Math.max(1, command.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    const { dateFrom, dateTo } = this.gameDailyStatsRepository.getLeaderboardDateRange(type);
    const { topWinners, topLosers } = await this.gameDailyStatsRepository.getLeaderboard(type, limit);

    const userIds = [
      ...topWinners.map((e) => e.userId),
      ...topLosers.map((e) => e.userId),
    ];
    const uniqueIds = [...new Set(userIds)];
    const users = await this.userRepository.findByIds(uniqueIds, [
      'userBadges',
      'userBadges.badge',
    ]);
    const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

    const toItem = (
      entry: { userId: string; totalNetWin: number; rank: number },
    ): LeaderboardUserItemDto => {
      const user = userMap.get(entry.userId);
      const activeBadge = user?.userBadges?.find(
        (ub: any) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
      );

      return {
        userId: entry.userId,
        displayName: user?.displayName ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        userBadge: activeBadge
          ? {
              name: activeBadge.badge.name,
              iconUrl: activeBadge.badge.iconUrl || null,
              iconName: activeBadge.badge.iconName || null,
              color: activeBadge.badge.color || null,
              earnedAt: activeBadge.earnedAt,
              description: activeBadge.badge.description || null,
              obtain: activeBadge.badge.obtain || null,
            }
          : null,
        totalNetWin: entry.totalNetWin,
        rank: entry.rank,
      };
    };

    return {
      period: type,
      dateFrom,
      dateTo,
      topWinners: topWinners.map(toItem),
      topLosers: topLosers.map(toItem),
    };
  }
}
