import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { IAttendanceRepository } from '../../infrastructure/persistence/repositories/attendance.repository';
import { IAttendanceStatisticRepository } from '../../infrastructure/persistence/repositories/attendance-statistic.repository';
import { AttendanceStatistic } from '../../domain/entities/attendance-statistic.entity';

export type AttendanceFilter = 'today' | 'streak' | 'total';

export interface ListAttendancesCommand {
  filter: AttendanceFilter;
  cursor?: string;
  limit?: number;
}

export interface AttendanceListItem {
  rankByTime?: number;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  message?: string;
  attendanceTime: Date;
  currentStreak: number;
  totalAttendanceDays: number;
}

export interface ListAttendancesResult {
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

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const realLimit =
      command.limit && command.limit > 0 ? (command.limit > 50 ? 50 : command.limit) : 20;

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
      // Use attendanceRank from statistics (rank by time when checking in)
      const data: AttendanceListItem[] = result.data.map((attendance) => {
        const stat = statisticsMap.get(attendance.userId);
        return {
          rankByTime: stat?.attendanceRank || undefined,
          userId: attendance.userId,
          nickname: attendance.user?.displayName || '',
          avatarUrl: attendance.user?.avatarUrl,
          message: attendance.message,
          attendanceTime: attendance.createdAt,
          currentStreak: stat?.currentStreak || 0,
          totalAttendanceDays: stat?.totalAttendanceDays || 0,
        };
      });

      return {
        totalCount,
        data,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    } else {
      // Query from attendance_statistics table
      const sortBy = command.filter === 'streak' ? 'streak' : 'total';
      const result = await this.statisticRepository.findByDate(
        today,
        sortBy,
        command.cursor,
        realLimit,
      );

      // Map to AttendanceListItem
      // Use attendanceRank from statistics (rank by time when checking in)
      const data: AttendanceListItem[] = result.data.map((stat) => {
        return {
          rankByTime: stat.attendanceRank || undefined,
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
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    }
  }
}
