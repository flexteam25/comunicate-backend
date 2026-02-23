import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../repositories/gifticon-redemption.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class GifticonRedemptionRepository implements IGifticonRedemptionRepository {
  constructor(
    @InjectRepository(GifticonRedemption)
    private readonly repository: Repository<GifticonRedemption>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<GifticonRedemption | null> {
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  async findByUserIdWithCursor(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<GifticonRedemption>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({ userId });
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
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.gifticon', 'gifticon')
      .where('redemption.userId = :userId', { userId });

    const sortField = `redemption.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy(`redemption.${sortBy}`, sortOrder);
      queryBuilder.addOrderBy('redemption.id', sortOrder);
    }

    if (decodedId) {
      queryBuilder.andWhere('redemption.id != :cursorId', { cursorId: decodedId });
      if (decodedSortValue !== undefined) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND redemption.id < :cursorId))`,
            { sortValue: decodedSortValue, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND redemption.id > :cursorId))`,
            { sortValue: decodedSortValue, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('redemption.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('redemption.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy(`redemption.${sortBy}`, sortOrder);
        queryBuilder.addOrderBy('redemption.id', sortOrder);
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    const getSortValue = (item: GifticonRedemption): string | Date | undefined => {
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
        previousCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
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
        previousCursor = CursorPaginationUtil.encodeCursor(newestInPage.id, getSortValue(newestInPage), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    }

    return { data, nextCursor, previousCursor: previousCursor ?? null };
  }

  async findAllWithCursor(
    filters?: {
      status?: string;
      userId?: string;
      gifticonId?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<GifticonRedemption>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      status: filters?.status ?? null,
      userId: filters?.userId ?? null,
      gifticonId: filters?.gifticonId ?? null,
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
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.user', 'user')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .leftJoinAndSelect('redemption.gifticon', 'gifticon');

    if (filters?.status) {
      queryBuilder.andWhere('redemption.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('redemption.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.gifticonId) {
      queryBuilder.andWhere('redemption.gifticonId = :gifticonId', {
        gifticonId: filters.gifticonId,
      });
    }

    const sortField = `redemption.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy(`redemption.${sortBy}`, sortOrder);
      queryBuilder.addOrderBy('redemption.id', sortOrder);
    }

    if (decodedId) {
      queryBuilder.andWhere('redemption.id != :cursorId', { cursorId: decodedId });
      const parsedSortValue =
        decodedSortValue != null && sortBy === 'createdAt'
          ? new Date(decodedSortValue)
          : decodedSortValue;
      if (parsedSortValue !== null && parsedSortValue !== undefined) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND redemption.id < :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND redemption.id > :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('redemption.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('redemption.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy(`redemption.${sortBy}`, sortOrder);
        queryBuilder.addOrderBy('redemption.id', sortOrder);
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    const getSortValue = (item: GifticonRedemption): string | Date | undefined => {
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
        previousCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
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
        previousCursor = CursorPaginationUtil.encodeCursor(newestInPage.id, getSortValue(newestInPage), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    }

    return { data, nextCursor, previousCursor: previousCursor ?? null };
  }

  async create(redemption: Partial<GifticonRedemption>): Promise<GifticonRedemption> {
    const entity = this.repository.create(redemption);
    return this.repository.save(entity);
  }

  async update(
    id: string,
    data: Partial<GifticonRedemption>,
  ): Promise<GifticonRedemption> {
    await this.repository.update(id, {
      ...data,
      updatedAt: new Date(),
    });
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.GIFTCON_REDEMPTION_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
