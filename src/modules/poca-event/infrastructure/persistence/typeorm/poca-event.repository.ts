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
    let prevCursor: string | null = null;

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
      status?: PocaEventStatus;
      search?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PocaEvent>> {
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10) || 20;
    const realLimit = limitNum > 50 ? 50 : Math.max(1, limitNum);
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

    // Step 1: Paginate by event IDs only (no banners join) so limit applies to events, not rows.
    const idQb = this.repository
      .createQueryBuilder('event')
      .select('event.id')
      .where('event.deletedAt IS NULL');

    if (filters?.status) {
      idQb.andWhere('event.status = :status', { status: filters.status });
    }
    if (filters?.search) {
      idQb.andWhere('LOWER(event.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    const sortField = `event.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      if (sortOrder === 'DESC') {
        idQb.addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        idQb.orderBy(`event.${sortBy}`, 'ASC');
      }
      idQb.addOrderBy('event.id', sortOrder);
    }

    if (decodedId) {
      let parsedSortValue: string | number | Date | undefined = decodedSortValue;
      if (decodedSortValue != null && sortBy === 'createdAt') {
        parsedSortValue = new Date(decodedSortValue);
      } else if (decodedSortValue != null) {
        parsedSortValue = decodedSortValue;
      }

      if (direction === 'forward') {
        idQb.andWhere('event.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            idQb.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND event.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            idQb.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            idQb.andWhere('event.id > :cursorId', { cursorId: decodedId });
          } else {
            idQb.andWhere('event.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            idQb.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            idQb.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND event.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            idQb.andWhere('event.id < :cursorId', { cursorId: decodedId });
          } else {
            idQb.andWhere('event.id > :cursorId', { cursorId: decodedId });
          }
        }
        if (sortOrder === 'DESC') {
          idQb.orderBy(`event.${sortBy}`, 'ASC').addOrderBy('event.id', 'ASC');
        } else {
          idQb.orderBy(`event.${sortBy}`, 'DESC').addOrderBy('event.id', 'DESC');
        }
      }
    }

    idQb.take(realLimit + 1);
    // Use getMany() so we get entities with .id - avoids raw result key differences across drivers
    const idEntities = await idQb.getMany();
    const orderedIds = idEntities.map((e) => e.id);
    const hasMore = orderedIds.length > realLimit;
    const pageIds = orderedIds.slice(0, realLimit);

    if (pageIds.length === 0) {
      return {
        data: [],
        nextCursor: null,
        prevCursor: null,
      };
    }

    // Step 2: Load full events with banners for this page of IDs, preserving order.
    const queryBuilder = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.banners', 'banner')
      .where('event.deletedAt IS NULL')
      .andWhere('event.id IN (:...pageIds)', { pageIds })
      .orderBy('banner.order', 'ASC');

    // Preserve pagination order (same as id query)
    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.addOrderBy(`event.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('event.id', sortOrder);

    const entities = await queryBuilder.getMany();

    // Restore order to match pageIds (getMany() may not preserve IN order in all DBs)
    const idToEvent = new Map(entities.map((e) => [e.id, e]));
    let data = pageIds.map((id) => idToEvent.get(id)).filter((e): e is PocaEvent => e != null);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getSortValue = (item: PocaEvent): string | number | Date | undefined => {
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
        nextCursor = CursorPaginationUtil.encodeCursor(oldestInPage.id, getSortValue(oldestInPage), {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
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
}
