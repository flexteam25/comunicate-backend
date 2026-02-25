import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointTransaction } from '../../../domain/entities/point-transaction.entity';
import { IPointTransactionRepository } from '../repositories/point-transaction.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';

@Injectable()
export class PointTransactionRepository implements IPointTransactionRepository {
  constructor(
    @InjectRepository(PointTransaction)
    private readonly repository: Repository<PointTransaction>,
  ) {}

  async findByUserIdWithCursor(
    userId: string,
    filters?: {
      type?: 'earn' | 'spend' | 'refund';
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PointTransaction>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      userId,
      type: filters?.type ?? null,
      startDate: filters?.startDate?.toISOString() ?? null,
      endDate: filters?.endDate?.toISOString() ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (filters?.type) {
      queryBuilder.andWhere('transaction.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    queryBuilder
      .orderBy('transaction.createdAt', sortOrder)
      .addOrderBy('transaction.id', sortOrder)
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
      userName?: string;
      type?: 'earn' | 'spend' | 'refund';
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PointTransaction>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      userName: filters?.userName ?? null,
      type: filters?.type ?? null,
      startDate: filters?.startDate?.toISOString() ?? null,
      endDate: filters?.endDate?.toISOString() ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user');

    if (filters?.userName) {
      queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:userName)', {
        userName: `%${filters.userName}%`,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('transaction.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    queryBuilder
      .orderBy('transaction.createdAt', sortOrder)
      .addOrderBy('transaction.id', sortOrder)
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

  async create(transaction: Partial<PointTransaction>): Promise<PointTransaction> {
    const entity = this.repository.create(transaction);
    return this.repository.save(entity);
  }
}
