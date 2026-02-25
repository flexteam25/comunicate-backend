import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../repositories/point-exchange.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      userId,
      status: filters?.status ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.site', 'site')
      .where('exchange.userId = :userId', { userId });

    if (filters?.status) {
      queryBuilder.andWhere('exchange.status = :status', {
        status: filters.status,
      });
    }

    queryBuilder
      .orderBy('exchange.createdAt', sortOrder)
      .addOrderBy('exchange.id', sortOrder)
      .skip(offset)
      .take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

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
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      status: filters?.status ?? null,
      siteId: filters?.siteId ?? null,
      userId: filters?.userId ?? null,
      userName: filters?.userName ?? null,
      startDate: filters?.startDate?.toISOString() ?? null,
      endDate: filters?.endDate?.toISOString() ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    queryBuilder
      .orderBy('exchange.createdAt', sortOrder)
      .addOrderBy('exchange.id', sortOrder)
      .skip(offset)
      .take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

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
