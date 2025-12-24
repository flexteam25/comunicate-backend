import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointTransaction } from '../../../domain/entities/point-transaction.entity';
import { IPointTransactionRepository } from '../repositories/point-transaction.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

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
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PointTransaction>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder: 'ASC' | 'DESC' = 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .orderBy('transaction.createdAt', 'DESC')
      .addOrderBy('transaction.id', 'DESC');

    if (filters?.type) {
      queryBuilder.andWhere('transaction.type = :type', {
        type: filters.type,
      });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `transaction.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND transaction.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('transaction.id < :cursorId', {
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

  async create(transaction: Partial<PointTransaction>): Promise<PointTransaction> {
    const entity = this.repository.create(transaction);
    return this.repository.save(entity);
  }
}
