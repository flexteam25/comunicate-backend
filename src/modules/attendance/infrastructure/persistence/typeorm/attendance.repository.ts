import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from '../../../domain/entities/attendance.entity';
import { IAttendanceRepository } from '../repositories/attendance.repository';
import { CursorPaginationUtil } from '../../../../../shared/utils/cursor-pagination.util';

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
    hasMore: boolean;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const queryBuilder = this.repository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('attendance.attendance_date = :date', { date })
      .orderBy('attendance.createdAt', 'ASC')
      .addOrderBy('attendance.id', 'ASC');

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue) {
          const sortDate = new Date(sortValue);
          queryBuilder.andWhere(
            '(attendance.createdAt > :sortDate OR (attendance.createdAt = :sortDate AND attendance.id > :cursorId))',
            { sortDate, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('attendance.id > :cursorId', { cursorId: id });
        }
      } catch {
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
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt);
    }

    return {
      data,
      nextCursor,
      hasMore,
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
}
