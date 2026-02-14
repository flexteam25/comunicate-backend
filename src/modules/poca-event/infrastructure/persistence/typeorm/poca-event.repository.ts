import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../repositories/poca-event.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class PocaEventRepository implements IPocaEventRepository {
  constructor(
    @InjectRepository(PocaEvent)
    private readonly repository: Repository<PocaEvent>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<PocaEvent | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('event')
      .where('event.id = :id', { id })
      .andWhere('event.deletedAt IS NULL');

    if (relations?.includes('banners')) {
      queryBuilder.leftJoinAndSelect('event.banners', 'banner');
      queryBuilder.orderBy('banner.order', 'ASC');
    }

    // Calculate viewCount dynamically from view table (only authenticated users, distinct)
    queryBuilder.addSelect(
      `(SELECT COUNT(DISTINCT user_id) FROM poca_event_views WHERE event_id = event.id AND user_id IS NOT NULL)`,
      'viewCount',
    );

    const result = await queryBuilder.getRawAndEntities();
    if (result.entities.length === 0) {
      return null;
    }

    const event = result.entities[0];
    const rawData = result.raw[0];
    (event as any).viewCount = parseInt(rawData?.viewCount || '0', 10);

    return event;
  }

  async findByIdOrSlugPublic(
    idOrSlug: string,
    relations?: string[],
  ): Promise<PocaEvent | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );

    const now = new Date();
    const queryBuilder = this.repository
      .createQueryBuilder('event')
      .where('event.deletedAt IS NULL')
      .andWhere('event.status = :status', { status: PocaEventStatus.PUBLISHED })
      .andWhere('(event.startsAt IS NULL OR event.startsAt <= :now)', { now })
      .andWhere('(event.endsAt IS NULL OR event.endsAt >= :now)', { now });

    if (isUuid) {
      queryBuilder.andWhere('event.id = :idOrSlug', { idOrSlug });
    } else {
      queryBuilder.andWhere('event.slug = :idOrSlug', { idOrSlug });
    }

    if (relations?.includes('banners')) {
      queryBuilder.leftJoinAndSelect('event.banners', 'banner');
      queryBuilder.orderBy('banner.order', 'ASC');
    }

    // Calculate viewCount dynamically from view table (only authenticated users, distinct)
    queryBuilder.addSelect(
      `(SELECT COUNT(DISTINCT user_id) FROM poca_event_views WHERE event_id = event.id AND user_id IS NOT NULL)`,
      'viewCount',
    );

    const result = await queryBuilder.getRawAndEntities();
    if (result.entities.length === 0) {
      return null;
    }

    const event = result.entities[0];
    const rawData = result.raw[0];
    (event as any).viewCount = parseInt(rawData?.viewCount || '0', 10);

    return event;
  }

  async findVisibleWithCursor(
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PocaEvent>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'startsAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';
    const now = new Date();
     const filterKey = JSON.stringify({ scope: 'visible_poca_events' });
     const sortDefinition = 'startsAt:DESC,createdAt:DESC,id:DESC';

     let decodedId: string | undefined;
     let decodedSortValue: string | undefined;
     /** Parsed composite sort for (startsAt, createdAt, id) to avoid duplicate rows across pages */
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
               // Legacy single sortValue, keep decodedSortValue only
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
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.banners', 'banner')
      .where('event.deletedAt IS NULL')
      .andWhere('event.status = :status', { status: PocaEventStatus.PUBLISHED })
      .andWhere('(event.startsAt IS NULL OR event.startsAt <= :now)', { now })
      .andWhere('(event.endsAt IS NULL OR event.endsAt >= :now)', { now })
      .orderBy('banner.order', 'ASC');

    // Calculate viewCount dynamically from view table (only authenticated users, distinct)
    queryBuilder.addSelect(
      `(SELECT COUNT(DISTINCT user_id) FROM poca_event_views WHERE event_id = event.id AND user_id IS NOT NULL)`,
      'viewCount',
    );

    const sortField = `event.${sortBy}`;

    // Base ordering: newest first when going forward
    if (!decodedId || direction === 'forward') {
      queryBuilder
        .addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST')
        .addOrderBy('event.createdAt', 'DESC')
        .addOrderBy('event.id', 'DESC');
    }

    // Apply cursor pagination (full sort key: startsAt, createdAt, id to avoid duplicates)
    if (decodedId) {
      queryBuilder.andWhere('event.id != :cursorId', { cursorId: decodedId });
      if (direction === 'forward') {
        // Next page: events strictly before boundary in (startsAt DESC, createdAt DESC, id DESC)
        if (boundStartsAt !== undefined && boundCreatedAt !== undefined) {
          if (boundStartsAt !== null) {
            queryBuilder.andWhere(
              `(event.startsAt < :boundStartsAt OR (event.startsAt = :boundStartsAt AND event.createdAt < :boundCreatedAt) OR (event.startsAt = :boundStartsAt AND event.createdAt = :boundCreatedAt AND event.id < :cursorId))`,
              {
                boundStartsAt,
                boundCreatedAt,
                cursorId: decodedId,
              },
            );
          } else {
            queryBuilder.andWhere(
              `(event.startsAt IS NOT NULL OR (event.startsAt IS NULL AND (event.createdAt < :boundCreatedAt OR (event.createdAt = :boundCreatedAt AND event.id < :cursorId))))`,
              { boundCreatedAt, cursorId: decodedId },
            );
          }
        } else if (decodedSortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId) OR (${sortField} IS NULL AND event.createdAt < :createdAtValue))`,
            {
              sortValue: decodedSortValue,
              cursorId: decodedId,
              createdAtValue: decodedSortValue,
            },
          );
        } else {
          queryBuilder.andWhere('event.id < :cursorId', { cursorId: decodedId });
        }
      } else {
        // Previous page: events strictly after boundary
        if (boundStartsAt !== undefined && boundCreatedAt !== undefined) {
          if (boundStartsAt !== null) {
            queryBuilder.andWhere(
              `(event.startsAt > :boundStartsAt OR (event.startsAt = :boundStartsAt AND event.createdAt > :boundCreatedAt) OR (event.startsAt = :boundStartsAt AND event.createdAt = :boundCreatedAt AND event.id > :cursorId))`,
              {
                boundStartsAt,
                boundCreatedAt,
                cursorId: decodedId,
              },
            );
          } else {
            // Boundary startsAt = NULL: previous page = all rows with startsAt NOT NULL plus NULL rows where (createdAt, id) > boundary
            queryBuilder.andWhere(
              `(event.startsAt IS NOT NULL OR (event.startsAt IS NULL AND (event.createdAt > :boundCreatedAt OR (event.createdAt = :boundCreatedAt AND event.id > :cursorId))))`,
              { boundCreatedAt, cursorId: decodedId },
            );
          }
        } else if (decodedSortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND event.id > :cursorId) OR (${sortField} IS NULL AND event.createdAt > :createdAtValue))`,
            {
              sortValue: decodedSortValue,
              cursorId: decodedId,
              createdAtValue: decodedSortValue,
            },
          );
        } else {
          queryBuilder.andWhere('event.id > :cursorId', { cursorId: decodedId });
        }

        // Use same ORDER DESC as display so result order is correct without reversing
        queryBuilder
          .addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST')
          .addOrderBy('event.createdAt', 'DESC')
          .addOrderBy('event.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    let data = result.entities.slice(0, realLimit);

    // Create a map of event.id -> raw data to handle cases where joins create multiple rows per event
    const rawDataMap = new Map<string, Record<string, unknown>>();
    result.raw.forEach((rawRow: Record<string, unknown>) => {
      const eventId =
        (rawRow.event_id as string) ||
        (rawRow.eventId as string) ||
        (rawRow['event_id'] as string) ||
        (rawRow['eventId'] as string);
      if (eventId && !rawDataMap.has(eventId)) {
        rawDataMap.set(eventId, rawRow);
      }
    });

    // Map viewCount from raw data to entities
    data.forEach((event) => {
      const rawData = rawDataMap.get(event.id);
      if (rawData) {
        (event as any).viewCount = parseInt(String(rawData.viewCount || '0'), 10);
      } else {
        (event as any).viewCount = 0;
      }
    });

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    // Composite sort value for (startsAt, createdAt, id) so cursor boundary matches full order
    const getCompositeSortValue = (event: PocaEvent): string => {
      const s =
        event.startsAt != null ? event.startsAt.toISOString() : null;
      const c =
        event.createdAt != null ? event.createdAt.toISOString() : null;
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
      // prevCursor must use first item of current page so "previous" returns the full page before
      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
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
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getCompositeSortValue(newestInPage),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    }

    return {
      data,
      nextCursor,
      previousCursor: previousCursor ?? null,
    };
  }

  async findAllAdmin(
    filters?: {
      status?: PocaEventStatus;
      search?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PocaEvent>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.banners', 'banner')
      .where('event.deletedAt IS NULL')
      .orderBy('banner.order', 'ASC');

    if (filters?.status) {
      queryBuilder.andWhere('event.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      queryBuilder.andWhere('LOWER(event.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `event.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND event.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('event.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('event.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`event.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('event.id', sortOrder);
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
    };
  }

  async create(event: Partial<PocaEvent>): Promise<PocaEvent> {
    const entity = this.repository.create(event);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<PocaEvent>): Promise<PocaEvent> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.POCA_EVENT_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'viewCount', 1);
  }
}
