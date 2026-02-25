import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from '../../../domain/entities/attendance.entity';
import { IAttendanceRepository } from '../repositories/attendance.repository';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';

@Injectable()
export class AttendanceRepository implements IAttendanceRepository {
  constructor(
    @InjectRepository(Attendance)
    private readonly repository: Repository<Attendance>,
  ) {}

  async create(attendance: Partial<Attendance>): Promise<Attendance> {
    const entity = this.repository.create(attendance);
    return this.repository.save(entity);
  }

  async findByUserAndDate(userId: string, date: Date): Promise<Attendance | null> {
    return this.repository.findOne({
      where: {
        userId,
        attendanceDate: date,
      },
    });
  }

  async findByDate(
    date: Date,
    cursor?: string,
    limit = 20,
  ): Promise<{
    data: Attendance[];
    nextCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({ date: date.toISOString().split('T')[0] });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('attendance.attendance_date = :date', { date })
      .orderBy('attendance.createdAt', 'ASC')
      .addOrderBy('attendance.id', 'ASC')
      .skip(offset)
      .take(realLimit + 1);

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

  async findAllByDate(date: Date): Promise<Attendance[]> {
    return this.repository.find({
      where: {
        attendanceDate: date,
      },
      order: {
        createdAt: 'ASC',
        id: 'ASC',
      },
    });
  }

  async countByDate(date: Date): Promise<number> {
    return this.repository.count({
      where: {
        attendanceDate: date,
      },
    });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    cursor?: string,
    limit = 20,
    search?: string,
  ): Promise<{
    data: Attendance[];
    nextCursor: string | null;
    prevCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      search: search ? search.toLowerCase() : null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('attendance.attendance_date >= :startDate', { startDate })
      .andWhere('attendance.attendance_date <= :endDate', { endDate });

    if (search) {
      queryBuilder.andWhere(
        '(user.deletedAt IS NULL AND LOWER(user.displayName) LIKE LOWER(:search))',
        {
          search: `%${search}%`,
        },
      );
    }

    queryBuilder
      .orderBy('attendance.attendanceDate', 'DESC')
      .addOrderBy('attendance.createdAt', 'DESC')
      .addOrderBy('attendance.id', 'DESC')
      .skip(offset)
      .take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return {
      data,
      nextCursor,
      prevCursor,
    };
  }

  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    cursor?: string,
    limit = 20,
  ): Promise<{
    data: Attendance[];
    nextCursor: string | null;
    prevCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      userId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('attendance.user_id = :userId', { userId })
      .andWhere('attendance.attendance_date >= :startDate', { startDate })
      .andWhere('attendance.attendance_date <= :endDate', { endDate })
      .orderBy('attendance.attendanceDate', 'DESC')
      .addOrderBy('attendance.createdAt', 'DESC')
      .addOrderBy('attendance.id', 'DESC')
      .skip(offset)
      .take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return {
      data,
      nextCursor,
      prevCursor,
    };
  }
}
