import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../repositories/gifticon.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class GifticonRepository implements IGifticonRepository {
  constructor(
    @InjectRepository(Gifticon)
    private readonly repository: Repository<Gifticon>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Gifticon | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findByIdOrSlugPublic(
    idOrSlug: string,
    _relations?: string[],
  ): Promise<Gifticon | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );

    const now = new Date();
    const queryBuilder = this.repository
      .createQueryBuilder('gifticon')
      .where('gifticon.deletedAt IS NULL')
      .andWhere('gifticon.status = :status', { status: GifticonStatus.PUBLISHED })
      .andWhere('(gifticon.startsAt IS NULL OR gifticon.startsAt <= :now)', { now })
      .andWhere('(gifticon.endsAt IS NULL OR gifticon.endsAt >= :now)', { now });

    if (isUuid) {
      queryBuilder.andWhere('gifticon.id = :idOrSlug', { idOrSlug });
    } else {
      queryBuilder.andWhere('gifticon.slug = :idOrSlug', { idOrSlug });
    }

    return queryBuilder.getOne();
  }

  async findVisibleWithCursor(
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<Gifticon>> {
    const realLimit = limit > 50 ? 50 : limit;
    const now = new Date();
    const filterKey = JSON.stringify({ scope: 'visible_gifticons' });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('gifticon')
      .where('gifticon.deletedAt IS NULL')
      .andWhere('gifticon.status = :status', { status: GifticonStatus.PUBLISHED })
      .andWhere('(gifticon.startsAt IS NULL OR gifticon.startsAt <= :now)', { now })
      .andWhere('(gifticon.endsAt IS NULL OR gifticon.endsAt >= :now)', { now })
      .addOrderBy('gifticon.startsAt', 'DESC', 'NULLS LAST')
      .addOrderBy('gifticon.createdAt', 'DESC')
      .addOrderBy('gifticon.id', 'DESC')
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

    return {
      data,
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }

  async findAllAdmin(
    filters?: {
      status?: GifticonStatus;
      search?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<Gifticon>> {
    const realLimit = limit > 100 ? 100 : limit;
    const sortOrder = 'DESC' as 'ASC' | 'DESC';
    const filterKey = JSON.stringify({
      status: filters?.status ?? null,
      search: filters?.search ?? null,
      sortBy: 'createdAt',
      sortOrder,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('gifticon')
      .where('gifticon.deletedAt IS NULL');

    if (filters?.status) {
      queryBuilder.andWhere('gifticon.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      queryBuilder.andWhere('LOWER(gifticon.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy('gifticon.createdAt', 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy('gifticon.createdAt', 'ASC');
    }
    queryBuilder.addOrderBy('gifticon.id', sortOrder).skip(offset).take(realLimit + 1);

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

    return {
      data,
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }

  async create(gifticon: Partial<Gifticon>): Promise<Gifticon> {
    const entity = this.repository.create(gifticon);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<Gifticon>): Promise<Gifticon> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.GIFTICON_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
