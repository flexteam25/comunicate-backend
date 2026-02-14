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
    previousCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      search: search ? search.toLowerCase() : null,
    });
    const queryBuilder = this.repository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('attendance.attendance_date >= :startDate', { startDate })
      .andWhere('attendance.attendance_date <= :endDate', { endDate });

    // Search by user displayName (only if user exists and is not deleted)
    if (search) {
      queryBuilder.andWhere(
        '(user.deletedAt IS NULL AND LOWER(user.displayName) LIKE LOWER(:search))',
        {
          search: `%${search}%`,
        },
      );
    }

    let decodedId: string | undefined;
    let decodedSortCreatedAt: Date | undefined;
    let direction: 'forward' | 'backward' = 'forward';

    if (cursor) {
      try {
        const { id, sortValue, direction: decodedDirection, filterKey: cursorFilterKey } =
          CursorPaginationUtil.decodeCursor(cursor);

        // If the cursor was created for a different query (different filters),
        // treat it as invalid and fall back to the first page.
        if (cursorFilterKey && cursorFilterKey !== filterKey) {
          decodedId = undefined;
          decodedSortCreatedAt = undefined;
        } else {
          decodedId = id;
          if (sortValue) {
            decodedSortCreatedAt = new Date(sortValue);
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const sortDefinition = 'attendanceDate:DESC,createdAt:DESC,id:DESC';

    // Default sorting: newest first (forward)
    if (!decodedId || direction === 'forward') {
      queryBuilder
        .orderBy('attendance.attendanceDate', 'DESC')
        .addOrderBy('attendance.createdAt', 'DESC')
        .addOrderBy('attendance.id', 'DESC');
    }

    if (decodedId) {
      if (direction === 'forward') {
        if (decodedSortCreatedAt) {
          // Move forward (older records) from the current cursor
          queryBuilder.andWhere(
            '(attendance.createdAt < :sortCreatedAt OR (attendance.createdAt = :sortCreatedAt AND attendance.id < :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('attendance.id < :cursorId', { cursorId: decodedId });
        }
      } else {
        // direction === 'backward' → load newer records than the current cursor
        if (decodedSortCreatedAt) {
          queryBuilder.andWhere(
            '(attendance.createdAt > :sortCreatedAt OR (attendance.createdAt = :sortCreatedAt AND attendance.id > :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('attendance.id > :cursorId', { cursorId: decodedId });
        }

        // For previous page, we query in ascending order then reverse in memory
        queryBuilder
          .orderBy('attendance.attendanceDate', 'ASC')
          .addOrderBy('attendance.createdAt', 'ASC')
          .addOrderBy('attendance.id', 'ASC');
      }
    }

    queryBuilder.take(realLimit + 1);
    const rows = await queryBuilder.getMany();

    const hasMore = rows.length > realLimit;
    let data: Attendance[];
    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      // First page or moving forward: rows already in DESC order
      data = rows.slice(0, realLimit);

      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      // If we had a cursor, it represents the boundary to go back to
      if (decodedId && cursor) {
        previousCursor = CursorPaginationUtil.encodeCursor(decodedId, decodedSortCreatedAt, {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      // direction === 'backward' and we had a valid cursor
      const pageItemsAsc = rows.slice(0, realLimit);

      // Ensure final data is still in DESC order (newest first)
      data = pageItemsAsc.sort((a, b) => {
        const aTime =
          a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : new Date(a.createdAt).getTime();
        const bTime =
          b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : new Date(b.createdAt).getTime();

        if (aTime !== bTime) {
          return bTime - aTime;
        }
        return b.id.localeCompare(a.id);
      });

      // Going forward from this page should move towards older records based on the
      // oldest item in the current page.
      if (data.length > 0) {
        const oldestItemInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestItemInPage.id,
          oldestItemInPage.createdAt,
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }

      if (hasMore && data.length > 0) {
        // There are more newer records before this page → compute previousCursor from the newest item in this page
        const newestItemInPage = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestItemInPage.id,
          newestItemInPage.createdAt,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    }

    return {
      data,
      nextCursor,
      previousCursor,
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
    previousCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      userId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
    const queryBuilder = this.repository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('attendance.user_id = :userId', { userId })
      .andWhere('attendance.attendance_date >= :startDate', { startDate })
      .andWhere('attendance.attendance_date <= :endDate', { endDate });

    let decodedId: string | undefined;
    let decodedSortCreatedAt: Date | undefined;
    let direction: 'forward' | 'backward' = 'forward';

    if (cursor) {
      try {
        const { id, sortValue, direction: decodedDirection, filterKey: cursorFilterKey } =
          CursorPaginationUtil.decodeCursor(cursor);

        if (cursorFilterKey && cursorFilterKey !== filterKey) {
          decodedId = undefined;
          decodedSortCreatedAt = undefined;
        } else {
          decodedId = id;
          if (sortValue) {
            decodedSortCreatedAt = new Date(sortValue);
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const sortDefinition = 'attendanceDate:DESC,createdAt:DESC,id:DESC';

    // Default sorting: newest first
    if (!decodedId || direction === 'forward') {
      queryBuilder
        .orderBy('attendance.attendanceDate', 'DESC')
        .addOrderBy('attendance.createdAt', 'DESC')
        .addOrderBy('attendance.id', 'DESC');
    }

    if (decodedId) {
      if (direction === 'forward') {
        if (decodedSortCreatedAt) {
          queryBuilder.andWhere(
            '(attendance.createdAt < :sortCreatedAt OR (attendance.createdAt = :sortCreatedAt AND attendance.id < :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('attendance.id < :cursorId', { cursorId: decodedId });
        }
      } else {
        // direction === 'backward' → load newer records than the current cursor
        if (decodedSortCreatedAt) {
          queryBuilder.andWhere(
            '(attendance.createdAt > :sortCreatedAt OR (attendance.createdAt = :sortCreatedAt AND attendance.id > :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('attendance.id > :cursorId', { cursorId: decodedId });
        }

        // For previous page, we query in ascending order then reverse in memory
        queryBuilder
          .orderBy('attendance.attendanceDate', 'ASC')
          .addOrderBy('attendance.createdAt', 'ASC')
          .addOrderBy('attendance.id', 'ASC');
      }
    }

    queryBuilder.take(realLimit + 1);
    const rows = await queryBuilder.getMany();

    const hasMore = rows.length > realLimit;
    let data: Attendance[];
    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      // First page or moving forward: rows already in DESC order
      data = rows.slice(0, realLimit);

      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      if (decodedId && cursor) {
        previousCursor = CursorPaginationUtil.encodeCursor(decodedId, decodedSortCreatedAt, {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      // direction === 'backward' and we had a valid cursor
      const pageItemsAsc = rows.slice(0, realLimit);

      // Ensure final data is still in DESC order (newest first)
      data = pageItemsAsc.sort((a, b) => {
        const aTime =
          a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : new Date(a.createdAt).getTime();
        const bTime =
          b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : new Date(b.createdAt).getTime();

        if (aTime !== bTime) {
          return bTime - aTime;
        }
        return b.id.localeCompare(a.id);
      });

      // Going forward from this page should move towards older records based on the
      // oldest item in the current page.
      if (data.length > 0) {
        const oldestItemInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestItemInPage.id,
          oldestItemInPage.createdAt,
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }

      if (hasMore && data.length > 0) {
        const newestItemInPage = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestItemInPage.id,
          newestItemInPage.createdAt,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    }

    return {
      data,
      nextCursor,
      previousCursor,
    };
  }
}
