import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../repositories/gifticon.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

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
    relations?: string[],
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
    const sortBy = 'startsAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';
    const now = new Date();

    const queryBuilder = this.repository
      .createQueryBuilder('gifticon')
      .where('gifticon.deletedAt IS NULL')
      .andWhere('gifticon.status = :status', { status: GifticonStatus.PUBLISHED })
      .andWhere('(gifticon.startsAt IS NULL OR gifticon.startsAt <= :now)', { now })
      .andWhere('(gifticon.endsAt IS NULL OR gifticon.endsAt >= :now)', { now });

    // Sort by startsAt DESC, then createdAt DESC
    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `gifticon.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND gifticon.id < :cursorId) OR (${sortField} IS NULL AND gifticon.createdAt < :createdAtValue))`,
            {
              sortValue,
              cursorId: id,
              createdAtValue: sortValue,
            },
          );
        } else {
          queryBuilder.andWhere('gifticon.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .addOrderBy(`gifticon.${sortBy}`, 'DESC', 'NULLS LAST')
      .addOrderBy('gifticon.createdAt', 'DESC')
      .addOrderBy('gifticon.id', 'DESC')
      .take(realLimit + 1);

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
      } else {
        sortValue = lastItem.createdAt;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
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
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';

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

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `gifticon.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND gifticon.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND gifticon.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('gifticon.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('gifticon.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`gifticon.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`gifticon.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('gifticon.id', sortOrder);
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

    return {
      data,
      nextCursor,
      hasMore,
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
      throw new Error('Gifticon not found after update');
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
