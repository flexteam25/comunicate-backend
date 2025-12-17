import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { AttendanceStatistic } from '../../../domain/entities/attendance-statistic.entity';
import { IAttendanceStatisticRepository } from '../repositories/attendance-statistic.repository';
import { CursorPaginationUtil } from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class AttendanceStatisticRepository implements IAttendanceStatisticRepository {
  constructor(
    @InjectRepository(AttendanceStatistic)
    private readonly repository: Repository<AttendanceStatistic>,
    private readonly dataSource: DataSource,
  ) {}

  async findByUserAndDate(userId: string, date: Date): Promise<AttendanceStatistic | null> {
    return this.repository.findOne({
      where: {
        userId,
        statisticDate: date,
      },
    });
  }

  async findByUserIdsAndDate(userIds: string[], date: Date): Promise<AttendanceStatistic[]> {
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

  async createOrUpdate(statistic: Partial<AttendanceStatistic>): Promise<AttendanceStatistic> {
    if (!statistic.userId || !statistic.statisticDate) {
      throw new Error('userId and statisticDate are required');
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
      return this.repository.findOne({ where: { id: existing.id } }) as Promise<AttendanceStatistic>;
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
    hasMore: boolean;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const queryBuilder = this.repository
      .createQueryBuilder('stat')
      .leftJoinAndSelect('stat.user', 'user')
      .where('stat.statisticDate = :date', { date });

    // Apply sorting based on sortBy
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

    // Apply cursor pagination
    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue) {
          const sortNum = parseFloat(sortValue);
          if (sortBy === 'streak') {
            queryBuilder.andWhere(
              '(stat.currentStreak < :sortNum OR (stat.currentStreak = :sortNum AND stat.id > :cursorId))',
              { sortNum, cursorId: id },
            );
          } else if (sortBy === 'total') {
            queryBuilder.andWhere(
              '(stat.totalAttendanceDays < :sortNum OR (stat.totalAttendanceDays = :sortNum AND stat.currentStreak < :sortStreak OR (stat.totalAttendanceDays = :sortNum AND stat.currentStreak = :sortStreak AND stat.id > :cursorId)))',
              { sortNum, sortStreak: parseFloat(sortValue.split(',')[1] || '0'), cursorId: id },
            );
          }
        } else {
          queryBuilder.andWhere('stat.id > :cursorId', { cursorId: id });
        }
      } catch (error) {
        // Invalid cursor, ignore
      }
    }

    queryBuilder.take(realLimit + 1);
    const rows = await queryBuilder.getMany();

    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      let sortValue: string | undefined;
      if (sortBy === 'streak') {
        sortValue = String(lastItem.currentStreak);
      } else if (sortBy === 'total') {
        sortValue = `${lastItem.totalAttendanceDays},${lastItem.currentStreak}`;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async countByDate(date: Date): Promise<number> {
    return this.repository.count({
      where: {
        statisticDate: date,
      },
    });
  }
}
