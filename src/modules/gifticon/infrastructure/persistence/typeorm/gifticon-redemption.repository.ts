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

    const queryBuilder = this.repository
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.gifticon', 'gifticon')
      .where('redemption.userId = :userId', { userId })
      .orderBy('redemption.createdAt', 'DESC')
      .addOrderBy('redemption.id', 'DESC');

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `redemption.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND redemption.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('redemption.id < :cursorId', {
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
      userId?: string;
      gifticonId?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<GifticonRedemption>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';

    const queryBuilder = this.repository
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.user', 'user')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .leftJoinAndSelect('redemption.gifticon', 'gifticon')
      .orderBy('redemption.createdAt', 'DESC')
      .addOrderBy('redemption.id', 'DESC');

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

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `redemption.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND redemption.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('redemption.id < :cursorId', {
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
