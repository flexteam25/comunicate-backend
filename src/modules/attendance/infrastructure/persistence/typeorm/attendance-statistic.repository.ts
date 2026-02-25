import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Between } from 'typeorm';
import { AttendanceStatistic } from '../../../domain/entities/attendance-statistic.entity';
import { IAttendanceStatisticRepository } from '../repositories/attendance-statistic.repository';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
import { badRequest, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class AttendanceStatisticRepository implements IAttendanceStatisticRepository {
  constructor(
    @InjectRepository(AttendanceStatistic)
    private readonly repository: Repository<AttendanceStatistic>,
    private readonly dataSource: DataSource,
  ) {}

  async findByUserAndDate(
    userId: string,
    date: Date,
  ): Promise<AttendanceStatistic | null> {
    return this.repository.findOne({
      where: {
        userId,
        statisticDate: date,
      },
    });
  }

  async findByUserIdsAndDate(
    userIds: string[],
    date: Date,
  ): Promise<AttendanceStatistic[]> {
    if (userIds.length === 0) {
      return [];
    }
    return this.repository.find({
      where: {
        userId: In(userIds),
        statisticDate: date,
      },
    });
  }

  async findByUserIdsInDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceStatistic[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.repository.find({
      where: {
        userId: In(userIds),
        statisticDate: Between(startDate, endDate),
      },
    });
  }

  async createOrUpdate(
    statistic: Partial<AttendanceStatistic>,
  ): Promise<AttendanceStatistic> {
    if (!statistic.userId || !statistic.statisticDate) {
      throw badRequest(MessageKeys.ATTENDANCE_STATISTIC_REQUIRED_FIELDS);
    }

    const existing = await this.repository.findOne({
      where: {
        userId: statistic.userId,
        statisticDate: statistic.statisticDate,
      },
    });

    if (existing) {
      await this.repository.update(existing.id, {
        totalAttendanceDays: statistic.totalAttendanceDays,
        currentStreak: statistic.currentStreak,
        attendanceTime: statistic.attendanceTime,
        attendanceRank: statistic.attendanceRank,
        dailyMessage: statistic.dailyMessage,
      });
      return this.repository.findOne({
        where: { id: existing.id },
      });
    } else {
      const entity = this.repository.create(statistic);
      return this.repository.save(entity);
    }
  }

  async findByDate(
    date: Date,
    sortBy: 'streak' | 'total',
    cursor?: string,
    limit = 20,
  ): Promise<{
    data: AttendanceStatistic[];
    nextCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      date: date.toISOString().split('T')[0],
      sortBy,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('stat')
      .leftJoinAndSelect('stat.user', 'user')
      .where('stat.statisticDate = :date', { date });

    if (sortBy === 'streak') {
      queryBuilder
        .orderBy('stat.currentStreak', 'DESC')
        .addOrderBy('stat.totalAttendanceDays', 'DESC')
        .addOrderBy('stat.attendanceRank', 'ASC');
    } else if (sortBy === 'total') {
      queryBuilder
        .orderBy('stat.totalAttendanceDays', 'DESC')
        .addOrderBy('stat.currentStreak', 'DESC')
        .addOrderBy('stat.attendanceRank', 'ASC');
    }

    queryBuilder.skip(offset).take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;

    return {
      data,
      nextCursor,
    };
  }

  async countByDate(date: Date): Promise<number> {
    return this.repository.count({
      where: {
        statisticDate: date,
      },
    });
  }

  async findByUserIds(userIds: string[]): Promise<AttendanceStatistic[]> {
    if (userIds.length === 0) {
      return [];
    }
    // Get the latest statistic for each user (by statisticDate DESC)
    // Use DISTINCT ON for PostgreSQL to get the latest record per user
    return this.repository
      .createQueryBuilder('stat')
      .where('stat.userId IN (:...userIds)', { userIds })
      .distinctOn(['stat.userId'])
      .orderBy('stat.userId', 'ASC')
      .addOrderBy('stat.statisticDate', 'DESC')
      .getMany();
  }

  async findByUserId(userId: string): Promise<AttendanceStatistic | null> {
    // Get the latest statistic for the user (by statisticDate DESC)
    return this.repository
      .createQueryBuilder('stat')
      .where('stat.userId = :userId', { userId })
      .orderBy('stat.statisticDate', 'DESC')
      .limit(1)
      .getOne();
  }

  async findLatestStatisticsByRanking(
    sortBy: 'streak' | 'total',
    limit = 30,
  ): Promise<AttendanceStatistic[]> {
    const realLimit = limit > 50 ? 50 : limit;

    // Use raw SQL with DISTINCT ON to get latest statistic for each user
    const rawResults = await this.repository.query(
      `
      SELECT DISTINCT ON (stat.user_id) 
        stat.id
      FROM attendance_statistics stat
      INNER JOIN users u ON stat.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND (stat.current_streak > 0 OR stat.total_attendance_days > 0)
      ORDER BY stat.user_id, stat.statistic_date DESC
    `,
    );

    if (rawResults.length === 0) {
      return [];
    }

    const statisticIds = rawResults.map((r: { id: string }) => r.id);

    // Load all statistics with user relation
    const allStatistics = await this.repository.find({
      where: { id: In(statisticIds) },
      relations: ['user'],
    });

    // Create a map for quick lookup
    const statisticsMap = new Map(
      allStatistics.map((stat) => [stat.id, stat]),
    );

    // Sort by ranking criteria
    const sortedStatistics = rawResults
      .map((r: { id: string }) => statisticsMap.get(r.id))
      .filter((stat): stat is AttendanceStatistic => stat !== undefined)
      .sort((a, b) => {
        if (sortBy === 'streak') {
          if (b.currentStreak !== a.currentStreak) {
            return b.currentStreak - a.currentStreak;
          }
          if (b.totalAttendanceDays !== a.totalAttendanceDays) {
            return b.totalAttendanceDays - a.totalAttendanceDays;
          }
          return (
            new Date(b.statisticDate).getTime() -
            new Date(a.statisticDate).getTime()
          );
        } else {
          if (b.totalAttendanceDays !== a.totalAttendanceDays) {
            return b.totalAttendanceDays - a.totalAttendanceDays;
          }
          if (b.currentStreak !== a.currentStreak) {
            return b.currentStreak - a.currentStreak;
          }
          return (
            new Date(b.statisticDate).getTime() -
            new Date(a.statisticDate).getTime()
          );
        }
      });

    // Take only the limit
    return sortedStatistics.slice(0, realLimit);
  }
}
