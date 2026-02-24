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
    const sortBy = 'startsAt';
    const now = new Date();
    const filterKey = JSON.stringify({ scope: 'visible_gifticons' });
    const sortDefinition = 'startsAt:DESC,createdAt:DESC,id:DESC';

    let decodedId: string | undefined;
    let decodedSortValue: string | undefined;
    let boundStartsAt: string | null | undefined;
    let boundCreatedAt: string | undefined;
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
            try {
              const parsed = JSON.parse(sortValue) as { s?: string | null; c?: string };
              if (typeof parsed === 'object' && ('s' in parsed || 'c' in parsed)) {
                boundStartsAt = parsed.s;
                boundCreatedAt = parsed.c;
              }
            } catch {
              // Legacy single sortValue
            }
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
      .createQueryBuilder('gifticon')
      .where('gifticon.deletedAt IS NULL')
      .andWhere('gifticon.status = :status', { status: GifticonStatus.PUBLISHED })
      .andWhere('(gifticon.startsAt IS NULL OR gifticon.startsAt <= :now)', { now })
      .andWhere('(gifticon.endsAt IS NULL OR gifticon.endsAt >= :now)', { now });

    const sortField = `gifticon.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder
        .addOrderBy(`gifticon.${sortBy}`, 'DESC', 'NULLS LAST')
        .addOrderBy('gifticon.createdAt', 'DESC')
        .addOrderBy('gifticon.id', 'DESC');
    }

    if (decodedId) {
      queryBuilder.andWhere('gifticon.id != :cursorId', { cursorId: decodedId });
      if (direction === 'forward') {
        if (boundStartsAt !== undefined && boundCreatedAt !== undefined) {
          if (boundStartsAt !== null) {
            // Boundary has non-null startsAt: rows strictly after boundary in sort order
            queryBuilder.andWhere(
              `(gifticon.startsAt < :boundStartsAt OR (gifticon.startsAt = :boundStartsAt AND gifticon.createdAt < :boundCreatedAt) OR (gifticon.startsAt = :boundStartsAt AND gifticon.createdAt = :boundCreatedAt AND gifticon.id < :cursorId))`,
              {
                boundStartsAt,
                boundCreatedAt,
                cursorId: decodedId,
              },
            );
          } else {
            // Boundary has startsAt = NULL: only rows in NULL group strictly after boundary
            queryBuilder.andWhere(
              `(gifticon.startsAt IS NULL AND (gifticon.createdAt < :boundCreatedAt OR (gifticon.createdAt = :boundCreatedAt AND gifticon.id < :cursorId)))`,
              { boundCreatedAt, cursorId: decodedId },
            );
          }
        } else if (decodedSortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND gifticon.id < :cursorId) OR (${sortField} IS NULL AND gifticon.createdAt < :createdAtValue))`,
            {
              sortValue: decodedSortValue,
              cursorId: decodedId,
              createdAtValue: decodedSortValue,
            },
          );
        } else {
          queryBuilder.andWhere('gifticon.id < :cursorId', { cursorId: decodedId });
        }
      } else {
        if (boundStartsAt !== undefined && boundCreatedAt !== undefined) {
          if (boundStartsAt !== null) {
            queryBuilder.andWhere(
              `(gifticon.startsAt > :boundStartsAt OR (gifticon.startsAt = :boundStartsAt AND gifticon.createdAt > :boundCreatedAt) OR (gifticon.startsAt = :boundStartsAt AND gifticon.createdAt = :boundCreatedAt AND gifticon.id > :cursorId))`,
              {
                boundStartsAt,
                boundCreatedAt,
                cursorId: decodedId,
              },
            );
          } else {
            // Boundary startsAt = NULL: previous page = all startsAt NOT NULL plus NULL rows where (createdAt, id) > boundary
            queryBuilder.andWhere(
              `(gifticon.startsAt IS NOT NULL OR (gifticon.startsAt IS NULL AND (gifticon.createdAt > :boundCreatedAt OR (gifticon.createdAt = :boundCreatedAt AND gifticon.id > :cursorId))))`,
              { boundCreatedAt, cursorId: decodedId },
            );
          }
        } else if (decodedSortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND gifticon.id > :cursorId) OR (${sortField} IS NULL AND gifticon.createdAt > :createdAtValue))`,
            {
              sortValue: decodedSortValue,
              cursorId: decodedId,
              createdAtValue: decodedSortValue,
            },
          );
        } else {
          queryBuilder.andWhere('gifticon.id > :cursorId', { cursorId: decodedId });
        }
        // Use same ORDER DESC as display so result order is correct without reversing
        queryBuilder
          .addOrderBy(`gifticon.${sortBy}`, 'DESC', 'NULLS LAST')
          .addOrderBy('gifticon.createdAt', 'DESC')
          .addOrderBy('gifticon.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getCompositeSortValue = (item: Gifticon): string => {
      const s = item.startsAt != null ? item.startsAt.toISOString() : null;
      const c = item.createdAt != null ? item.createdAt.toISOString() : null;
      return JSON.stringify({ s, c });
    };

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          lastItem.id,
          getCompositeSortValue(lastItem),
          { direction: 'forward', sort: sortDefinition, filterKey },
        );
      }
      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          firstItem.id,
          getCompositeSortValue(firstItem),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    } else {
      // Backward: ORDER DESC already applied, data is in correct display order
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id,
          getCompositeSortValue(oldestInPage),
          { direction: 'forward', sort: sortDefinition, filterKey },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getCompositeSortValue(newestInPage),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    }

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
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';
    const filterKey = JSON.stringify({
      status: filters?.status ?? null,
      search: filters?.search ?? null,
      sortBy,
      sortOrder,
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

    const sortField = `gifticon.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(`gifticon.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.orderBy(`gifticon.${sortBy}`, 'ASC');
      }
      queryBuilder.addOrderBy('gifticon.id', sortOrder);
    }

    if (decodedId) {
      let parsedSortValue: string | number | Date | undefined = decodedSortValue;
      if (decodedSortValue != null && sortBy === 'createdAt') {
        parsedSortValue = new Date(decodedSortValue);
      } else if (decodedSortValue != null) {
        parsedSortValue = decodedSortValue;
      }

      if (direction === 'forward') {
        queryBuilder.andWhere('gifticon.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND gifticon.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND gifticon.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('gifticon.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('gifticon.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND gifticon.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND gifticon.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('gifticon.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('gifticon.id > :cursorId', { cursorId: decodedId });
          }
        }
        if (sortOrder === 'DESC') {
          queryBuilder
            .orderBy(`gifticon.${sortBy}`, 'ASC')
            .addOrderBy('gifticon.id', 'ASC');
        } else {
          queryBuilder
            .orderBy(`gifticon.${sortBy}`, 'DESC')
            .addOrderBy('gifticon.id', 'DESC');
        }
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getSortValue = (item: Gifticon): string | number | Date | undefined => {
      const val = (item as unknown as Record<string, unknown>)[sortBy];
      if (val instanceof Date) return val;
      if (val !== null && val !== undefined) return val as string | number;
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
      if (decodedId && cursor) {
        prevCursor = CursorPaginationUtil.encodeCursor(decodedId, decodedSortValue, {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      data = data.slice().reverse();
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id,
          getSortValue(oldestInPage),
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getSortValue(newestInPage),
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    }

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
