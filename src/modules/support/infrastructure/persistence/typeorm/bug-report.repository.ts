import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BugReport } from '../../../domain/entities/bug-report.entity';
import { IBugReportRepository, BugReportFilters } from '../repositories/bug-report.repository';
import { CursorPaginationResult, CursorPaginationUtil } from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class BugReportRepository implements IBugReportRepository {
  constructor(
    @InjectRepository(BugReport)
    private readonly repository: Repository<BugReport>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<BugReport | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findAllWithCursor(
    filters?: BugReportFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<BugReport>> {
    const queryBuilder = this.repository
      .createQueryBuilder('bugReport')
      .leftJoinAndSelect('bugReport.user', 'user')
      .leftJoinAndSelect('bugReport.viewedByAdmin', 'viewedByAdmin')
      .where('bugReport.deletedAt IS NULL');

    // Apply filters
    if (filters?.userId) {
      queryBuilder.andWhere('bugReport.userId = :userId', { userId: filters.userId });
    }
    if (filters?.isViewed !== undefined) {
      queryBuilder.andWhere('bugReport.isViewed = :isViewed', { isViewed: filters.isViewed });
    }

    // Apply cursor pagination
    if (cursor) {
      const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
      const sortField = `bugReport.${sortBy}`;

      if (sortValue) {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND bugReport.id > :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND bugReport.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        }
      } else {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere('bugReport.id > :cursorId', { cursorId: id });
        } else {
          queryBuilder.andWhere('bugReport.id < :cursorId', { cursorId: id });
        }
      }
    }

    // Apply sorting
    queryBuilder.orderBy(`bugReport.${sortBy}`, sortOrder);
    queryBuilder.addOrderBy('bugReport.id', sortOrder);

    // Fetch one extra to check if there's more
    queryBuilder.take(limit + 1);

    const bugReports = await queryBuilder.getMany();

    // Check if there's more data
    const hasMore = bugReports.length > limit;
    const data = hasMore ? bugReports.slice(0, limit) : bugReports;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const sortValue = (lastItem as any)[sortBy];
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async create(bugReport: Partial<BugReport>): Promise<BugReport> {
    const newBugReport = this.repository.create(bugReport);
    return this.repository.save(newBugReport);
  }

  async update(id: string, data: Partial<BugReport>): Promise<BugReport> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['user', 'viewedByAdmin']);
    if (!updated) {
      throw new Error('BugReport not found after update');
    }
    return updated;
  }

  async findByUserId(userId: string): Promise<BugReport[]> {
    return this.repository.find({
      where: { userId, deletedAt: null },
      relations: ['user', 'viewedByAdmin'],
      order: { createdAt: 'DESC' },
    });
  }
}

