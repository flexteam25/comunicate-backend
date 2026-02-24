import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../repositories/point-exchange.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { isUuid } from '../../../../../shared/utils/uuid.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class PointExchangeRepository implements IPointExchangeRepository {
  constructor(
    @InjectRepository(PointExchange)
    private readonly repository: Repository<PointExchange>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<PointExchange | null> {
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  async findByUserIdWithCursor(
    userId: string,
    filters?: {
      status?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PointExchange>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      userId,
      status: filters?.status ?? null,
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
          if (sortValue !== null && sortValue !== undefined) {
            decodedSortValue = sortValue;
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const queryBuilder = this.repository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.site', 'site')
      .where('exchange.userId = :userId', { userId });

    if (filters?.status) {
      queryBuilder.andWhere('exchange.status = :status', {
        status: filters.status,
      });
    }

    const sortField = `exchange.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy(`exchange.${sortBy}`, sortOrder);
      queryBuilder.addOrderBy('exchange.id', sortOrder);
    }

    if (decodedId) {
      queryBuilder.andWhere('exchange.id != :cursorId', { cursorId: decodedId });
      if (decodedSortValue !== undefined) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND exchange.id < :cursorId))`,
            { sortValue: decodedSortValue, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND exchange.id > :cursorId))`,
            { sortValue: decodedSortValue, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('exchange.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('exchange.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy(`exchange.${sortBy}`, sortOrder);
        queryBuilder.addOrderBy('exchange.id', sortOrder);
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getSortValue = (item: PointExchange): string | Date | undefined => {
      const val = item.createdAt;
      if (val != null) return val instanceof Date ? val : new Date(val);
      return undefined;
    };

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, getSortValue(lastItem), {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(oldestInPage.id, getSortValue(oldestInPage), {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(newestInPage.id, getSortValue(newestInPage), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    }

    return { data, nextCursor, prevCursor: prevCursor ?? null };
  }

  async findAllWithCursor(
    filters?: {
      status?: string;
      siteId?: string;
      userId?: string;
      userName?: string;
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PointExchange>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      status: filters?.status ?? null,
      siteId: filters?.siteId ?? null,
      userId: filters?.userId ?? null,
      userName: filters?.userName ?? null,
      startDate: filters?.startDate?.toISOString() ?? null,
      endDate: filters?.endDate?.toISOString() ?? null,
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
          if (sortValue !== null && sortValue !== undefined) {
            decodedSortValue = sortValue;
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const queryBuilder = this.repository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.user', 'user')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .leftJoinAndSelect('exchange.site', 'site')
      .leftJoinAndSelect('exchange.admin', 'admin')
      .leftJoinAndSelect('exchange.manager', 'manager');

    if (filters?.status) {
      queryBuilder.andWhere('exchange.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.siteId) {
      if (isUuid(filters.siteId)) {
        queryBuilder.andWhere('exchange.siteId = :siteId', {
          siteId: filters.siteId,
        });
      } else {
        queryBuilder.andWhere('site.slug = :siteSlug', {
          siteSlug: filters.siteId,
        });
      }
    }

    if (filters?.userId) {
      queryBuilder.andWhere('exchange.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.userName) {
      queryBuilder.andWhere(
        '(user.email ILIKE :userName OR user.displayName ILIKE :userName)',
        {
          userName: `%${filters.userName}%`,
        },
      );
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('exchange.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('exchange.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const sortField = `exchange.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy(`exchange.${sortBy}`, sortOrder);
      queryBuilder.addOrderBy('exchange.id', sortOrder);
    }

    if (decodedId) {
      queryBuilder.andWhere('exchange.id != :cursorId', { cursorId: decodedId });
      const parsedSortValue =
        decodedSortValue != null && sortBy === 'createdAt'
          ? new Date(decodedSortValue)
          : decodedSortValue;
      if (parsedSortValue !== null && parsedSortValue !== undefined) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND exchange.id < :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND exchange.id > :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('exchange.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('exchange.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy(`exchange.${sortBy}`, sortOrder);
        queryBuilder.addOrderBy('exchange.id', sortOrder);
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getSortValue = (item: PointExchange): string | Date | undefined => {
      const val = item.createdAt;
      if (val != null) return val instanceof Date ? val : new Date(val);
      return undefined;
    };

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, getSortValue(lastItem), {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(oldestInPage.id, getSortValue(oldestInPage), {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(newestInPage.id, getSortValue(newestInPage), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    }

    return { data, nextCursor, prevCursor: prevCursor ?? null };
  }

  async create(exchange: Partial<PointExchange>): Promise<PointExchange> {
    const entity = this.repository.create(exchange);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<PointExchange>): Promise<PointExchange> {
    await this.repository.update(id, {
      ...data,
      updatedAt: new Date(),
    });
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.POINT_EXCHANGE_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
