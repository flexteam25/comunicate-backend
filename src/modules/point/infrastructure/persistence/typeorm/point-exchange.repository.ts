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
    const sortOrder: 'ASC' | 'DESC' = 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.site', 'site')
      .where('exchange.userId = :userId', { userId })
      .orderBy('exchange.createdAt', 'DESC')
      .addOrderBy('exchange.id', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('exchange.status = :status', {
        status: filters.status,
      });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `exchange.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND exchange.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('exchange.id < :cursorId', {
            cursorId: id,
          });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue as string | number | Date;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore };
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

    const queryBuilder = this.repository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.user', 'user')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .leftJoinAndSelect('exchange.site', 'site')
      .leftJoinAndSelect('exchange.admin', 'admin')
      .leftJoinAndSelect('exchange.manager', 'manager')
      .orderBy('exchange.createdAt', 'DESC')
      .addOrderBy('exchange.id', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('exchange.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.siteId) {
      if (isUuid(filters.siteId)) {
        // Filter by site UUID
        queryBuilder.andWhere('exchange.siteId = :siteId', {
          siteId: filters.siteId,
        });
      } else {
        // Filter by site slug
        queryBuilder.andWhere('site.slug = :siteSlug', {
          siteSlug: filters.siteId,
        });
      }
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

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `exchange.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND exchange.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('exchange.id < :cursorId', {
            cursorId: id,
          });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue as string | number | Date;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore };
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
