import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { IAttendanceRepository } from '../../infrastructure/persistence/repositories/attendance.repository';
import { IAttendanceStatisticRepository } from '../../infrastructure/persistence/repositories/attendance-statistic.repository';
import { AttendanceStatistic } from '../../domain/entities/attendance-statistic.entity';
import { getTodayInKST } from '../../../../shared/utils/attendance-date.util';

export type AttendanceFilter = 'today' | 'streak' | 'total';

export interface ListAttendancesCommand {
  filter: AttendanceFilter;
  cursor?: string;
  limit?: number;
  /**
   * Optional current userId (for attended flag)
   */
  currentUserId?: string;
}

export interface AttendanceListItem {
  filterRank?: number; // Rank in the current list (based on filter)
  overviewRank?: number; // Rank for today based on total/streak
  userId: string;
  nickname: string;
  avatarUrl?: string;
  message?: string;
  attendanceTime: Date;
  currentStreak: number;
  totalAttendanceDays: number;
}

export interface ListAttendancesResult {
  /**
   * Current user's attendance status for today (when currentUserId is provided):
   * - true: current user has attended today
   * - false: current user has NOT attended today
   * - null: no current user / not applicable
   */
  attended: boolean | null;
  totalCount?: number; // Only when filter = 'today'
  data: AttendanceListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ListAttendancesUseCase {
  constructor(
    @Inject('IAttendanceRepository')
    private readonly attendanceRepository: IAttendanceRepository,
    @Inject('IAttendanceStatisticRepository')
    private readonly statisticRepository: IAttendanceStatisticRepository,
  ) {}

  async execute(command: ListAttendancesCommand): Promise<ListAttendancesResult> {
    if (!['today', 'streak', 'total'].includes(command.filter)) {
      throw new BadRequestException(
        'Invalid filter. Must be one of: today, streak, total',
      );
    }

    // Get today's date in KST (+9 timezone)
    const today = getTodayInKST();
    // Default limit: 20 for 'today', 30 for 'streak'/'total' ranking
    const defaultLimit = command.filter === 'today' ? 20 : 30;
    const realLimit =
      command.limit && command.limit > 0
        ? command.limit > 50
          ? 50
          : command.limit
        : defaultLimit;

    if (command.filter === 'today') {
      // Query from attendances table
      const result = await this.attendanceRepository.findByDate(
        today,
        command.cursor,
        realLimit,
      );

      const totalCount = await this.attendanceRepository.countByDate(today);

      // Get user IDs and load statistics
      const userIds = result.data.map((a) => a.userId);
      const statisticsMap = new Map<string, AttendanceStatistic>();
      if (userIds.length > 0) {
        const statistics = await this.statisticRepository.findByUserIdsAndDate(
          userIds,
          today,
        );
        statistics.forEach((stat) => {
          statisticsMap.set(stat.userId, stat);
        });
      }

      // Map to AttendanceListItem
      // Sort by overviewRank (based on total/streak) for today filter
      const data: AttendanceListItem[] = result.data
        .map((attendance) => {
          const stat = statisticsMap.get(attendance.userId);
          return {
            filterRank: stat?.attendanceRank || undefined, // Rank in list (same as overviewRank for today filter)
            overviewRank: stat?.attendanceRank || undefined, // Rank for today based on total/streak
            userId: attendance.userId,
            nickname: attendance.user?.displayName || '',
            avatarUrl: attendance.user?.avatarUrl,
            message: attendance.message,
            attendanceTime: attendance.createdAt,
            currentStreak: stat?.currentStreak || 0,
            totalAttendanceDays: stat?.totalAttendanceDays || 0,
          };
        })
        // Sort by overviewRank ASC (better rank = lower number)
        .sort((a, b) => {
          const rankA = a.overviewRank ?? Number.MAX_SAFE_INTEGER;
          const rankB = b.overviewRank ?? Number.MAX_SAFE_INTEGER;
          return rankA - rankB;
        });

      // Determine current user's attendance status for today (independent of pagination)
      let attended: boolean | null = null;
      if (command.currentUserId) {
        const existing = await this.attendanceRepository.findByUserAndDate(
          command.currentUserId,
          today,
        );
        attended = !!existing;
      }

      return {
        totalCount,
        attended,
        data,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    } else {
      // Query latest statistics for all users (ranking)
      const sortBy = command.filter === 'streak' ? 'streak' : 'total';
      const statistics = await this.statisticRepository.findLatestStatisticsByRanking(
        sortBy,
        realLimit,
      );

      // Map to AttendanceListItem
      // Add rank based on position in sorted list
      const data: AttendanceListItem[] = statistics.map((stat, index) => {
        return {
          filterRank: index + 1, // Rank in the ranking list (1-based)
          overviewRank: stat.attendanceRank || undefined, // Rank for today (if available)
          userId: stat.userId,
          nickname: stat.user?.displayName || '',
          avatarUrl: stat.user?.avatarUrl,
          message: stat.dailyMessage,
          attendanceTime: stat.attendanceTime || stat.createdAt,
          currentStreak: stat.currentStreak,
          totalAttendanceDays: stat.totalAttendanceDays,
        };
      });

      return {
        data,
        nextCursor: null, // Ranking doesn't need pagination (fixed top 30)
        hasMore: false,
        attended: null,
      };
    }
  }
}
