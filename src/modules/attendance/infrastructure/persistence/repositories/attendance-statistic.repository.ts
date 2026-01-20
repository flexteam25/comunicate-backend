import { AttendanceStatistic } from '../../../domain/entities/attendance-statistic.entity';

export interface AttendanceStatisticFilters {
  statisticDate: Date;
}

export interface IAttendanceStatisticRepository {
  findByUserAndDate(userId: string, date: Date): Promise<AttendanceStatistic | null>;
  findByUserIdsAndDate(userIds: string[], date: Date): Promise<AttendanceStatistic[]>;
  createOrUpdate(statistic: Partial<AttendanceStatistic>): Promise<AttendanceStatistic>;
  findByUserIdsInDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceStatistic[]>;
  findByDate(
    date: Date,
    sortBy: 'streak' | 'total',
    cursor?: string,
    limit?: number,
  ): Promise<{
    data: AttendanceStatistic[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  countByDate(date: Date): Promise<number>;
  findByUserIds(userIds: string[]): Promise<AttendanceStatistic[]>;
  findByUserId(userId: string): Promise<AttendanceStatistic | null>;
  /**
   * Find latest statistics for all users, sorted by ranking
   * Used for "연속 출석 랭킹" (streak) and "전체 출석 랭킹" (total)
   * @param sortBy - 'streak' for currentStreak, 'total' for totalAttendanceDays
   * @param limit - Maximum number of records (default 30)
   * @returns Latest statistics sorted by ranking
   */
  findLatestStatisticsByRanking(
    sortBy: 'streak' | 'total',
    limit?: number,
  ): Promise<AttendanceStatistic[]>;
}
