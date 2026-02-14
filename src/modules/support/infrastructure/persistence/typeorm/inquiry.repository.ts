import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { IInquiryRepository, InquiryFilters } from '../repositories/inquiry.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class InquiryRepository implements IInquiryRepository {
  constructor(
    @InjectRepository(Inquiry)
    private readonly repository: Repository<Inquiry>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Inquiry | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findAllWithCursor(
    filters?: InquiryFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<Inquiry>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      ...(filters || {}),
      sortBy,
      sortOrder,
    });
    const sortDefinition = `${sortBy}:${sortOrder},id:${sortOrder}`;

    let decodedId: string | undefined;
    let decodedSortValue: string | undefined;
    let direction: 'forward' | 'backward' = 'forward';

    if (cursor) {
      try {
        const {
          id,
          sortValue,
          direction: decodedDirection,
          filterKey: cursorFilterKey,
        } = CursorPaginationUtil.decodeCursor(cursor);
        if (cursorFilterKey && cursorFilterKey !== filterKey) {
          decodedId = undefined;
          decodedSortValue = undefined;
        } else {
          decodedId = id;
          if (sortValue !== null && sortValue !== undefined) decodedSortValue = sortValue;
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const queryBuilder = this.repository
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.user', 'user')
      .leftJoinAndSelect('inquiry.admin', 'admin')
      .where('inquiry.deletedAt IS NULL');

    if (filters?.userName) {
      queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:userName)', {
        userName: `%${filters.userName}%`,
      });
    }
    if (filters?.status) {
      queryBuilder.andWhere('inquiry.status = :status', {
        status: filters.status,
      });
    }
    if (filters?.category) {
      queryBuilder.andWhere('inquiry.category = :category', {
        category: filters.category,
      });
    }
    if (filters?.adminName) {
      queryBuilder.andWhere('LOWER(admin.displayName) LIKE LOWER(:adminName)', {
        adminName: `%${filters.adminName}%`,
      });
    }

    const sortField = `inquiry.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy(`inquiry.${sortBy}`, sortOrder);
      queryBuilder.addOrderBy('inquiry.id', sortOrder);
    }

    if (decodedId) {
      if (direction === 'forward') {
        queryBuilder.andWhere('inquiry.id != :cursorId', { cursorId: decodedId });
        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND inquiry.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND inquiry.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('inquiry.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('inquiry.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND inquiry.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND inquiry.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('inquiry.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('inquiry.id > :cursorId', { cursorId: decodedId });
          }
        }
        const revOrder = sortOrder === 'DESC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(`inquiry.${sortBy}`, revOrder);
        queryBuilder.addOrderBy('inquiry.id', revOrder);
      }
    }

    queryBuilder.take(realLimit + 1);

    const inquiries = await queryBuilder.getMany();
    const hasMore = inquiries.length > realLimit;
    let data = inquiries.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1] as unknown as Record<string, unknown>;
        const sortVal = lastItem[sortBy];
        nextCursor = CursorPaginationUtil.encodeCursor(
          lastItem.id as string,
          sortVal !== null && sortVal !== undefined ? (sortVal as string | number | Date) : undefined,
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
      if (decodedId && cursor) {
        previousCursor = CursorPaginationUtil.encodeCursor(
          decodedId,
          decodedSortValue,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    } else {
      data = data.slice().reverse();
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1] as unknown as Record<string, unknown>;
        const sortVal = oldestInPage[sortBy];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id as string,
          sortVal !== null && sortVal !== undefined ? (sortVal as string | number | Date) : undefined,
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0] as unknown as Record<string, unknown>;
        const sortVal = newestInPage[sortBy];
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id as string,
          sortVal !== null && sortVal !== undefined ? (sortVal as string | number | Date) : undefined,
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
      previousCursor: previousCursor ?? null,
    };
  }

  async create(inquiry: Partial<Inquiry>): Promise<Inquiry> {
    const newInquiry = this.repository.create(inquiry);
    return this.repository.save(newInquiry);
  }

  async update(id: string, data: Partial<Inquiry>): Promise<Inquiry> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['user', 'admin']);
    if (!updated) {
      throw notFound(MessageKeys.INQUIRY_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async findByUserId(userId: string): Promise<Inquiry[]> {
    return this.repository.find({
      where: { userId, deletedAt: null },
      relations: ['user', 'admin'],
      order: { createdAt: 'DESC' },
    });
  }
}
