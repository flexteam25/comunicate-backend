import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../repositories/gifticon-redemption.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({ userId });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.gifticon', 'gifticon')
      .where('redemption.userId = :userId', { userId })
      .orderBy('redemption.createdAt', sortOrder)
      .addOrderBy('redemption.id', sortOrder)
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
      userId?: string;
      gifticonId?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<GifticonRedemption>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      status: filters?.status ?? null,
      userId: filters?.userId ?? null,
      gifticonId: filters?.gifticonId ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    queryBuilder
      .orderBy('redemption.createdAt', sortOrder)
      .addOrderBy('redemption.id', sortOrder)
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
