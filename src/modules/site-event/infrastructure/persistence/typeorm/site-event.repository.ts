import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteEvent } from '../../../domain/entities/site-event.entity';
import { ISiteEventRepository } from '../repositories/site-event.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { isUuid } from '../../../../../shared/utils/uuid.util';

@Injectable()
export class SiteEventRepository implements ISiteEventRepository {
  constructor(
    @InjectRepository(SiteEvent)
    private readonly repository: Repository<SiteEvent>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<SiteEvent | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('event')
      .where('event.id = :id', { id })
      .andWhere('event.deletedAt IS NULL');

    if (relations?.includes('site')) {
      queryBuilder.leftJoinAndSelect('event.site', 'site');
    }
    if (relations?.includes('user')) {
      queryBuilder.leftJoinAndSelect('event.user', 'user');
    }
    if (relations?.includes('admin')) {
      queryBuilder.leftJoinAndSelect('event.admin', 'admin');
    }
    if (relations?.includes('banners')) {
      queryBuilder.leftJoinAndSelect('event.banners', 'banners');
    } else {
      // Always load banners if not explicitly excluded
      queryBuilder.leftJoinAndSelect('event.banners', 'banners');
    }

    // Count distinct authenticated user views only
    queryBuilder.addSelect(
      `(SELECT COUNT(DISTINCT user_id) FROM site_event_views WHERE event_id = event.id AND user_id IS NOT NULL)`,
      'viewCount',
    );

    const result = await queryBuilder.getOne();
    return result || null;
  }

  async findBySiteId(
    siteId: string,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteEvent>> {
    const realLimit = limit > 50 ? 50 : limit;
    const now = new Date();
    const sortBy = 'startDate';
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({ siteId });
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
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.site', 'site')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.admin', 'admin')
      .leftJoinAndSelect('event.banners', 'banners')
      .addSelect(
        `(SELECT COUNT(DISTINCT user_id) FROM site_event_views WHERE event_id = event.id AND user_id IS NOT NULL)`,
        'viewCount',
      )
      .where('event.deletedAt IS NULL')
      .andWhere('event.isActive = :isActive', { isActive: true })
      .andWhere('event.endDate >= :now', { now });

    if (isUuid(siteId)) {
      queryBuilder.andWhere('event.siteId = :siteId', { siteId });
    } else {
      queryBuilder.andWhere('site.slug = :siteSlug', { siteSlug: siteId });
    }

    const sortField = `event.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
      queryBuilder.addOrderBy('event.id', 'DESC');
    }

    if (decodedId) {
      queryBuilder.andWhere('event.id != :cursorId', { cursorId: decodedId });
      if (decodedSortValue !== undefined) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId))`,
            { sortValue: decodedSortValue, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND event.id > :cursorId))`,
            { sortValue: decodedSortValue, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('event.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('event.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
        queryBuilder.addOrderBy('event.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    const data = result.entities.slice(0, realLimit);

    const rawDataMap = new Map<string, Record<string, unknown>>();
    result.raw.forEach((rawRow: Record<string, unknown>) => {
      const eventId =
        (rawRow.event_id as string) ||
        (rawRow.eventId as string) ||
        (rawRow.site_event_id as string) ||
        (rawRow.siteEventId as string) ||
        (rawRow['event_id'] as string) ||
        (rawRow['eventId'] as string);
      if (eventId && !rawDataMap.has(eventId)) {
        rawDataMap.set(eventId, rawRow);
      }
    });

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

    const getSortValue = (item: SiteEvent): string | Date | undefined => {
      const val = item.startDate;
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
        prevCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
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
        prevCursor = CursorPaginationUtil.encodeCursor(newestInPage.id, getSortValue(newestInPage), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    }

    return {
      data,
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }

  async findAll(
    filters?: {
      siteId?: string; // For exact match by UUID
      siteName?: string; // For LIKE search by site name
      userName?: string; // For LIKE search by user display name
      adminName?: string; // For LIKE search by admin display name
      isActive?: boolean;
      search?: string; // Search in title
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteEvent>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = filters?.sortBy || 'startDate';
    const sortOrder = filters?.sortOrder || 'DESC';
    const filterKey = JSON.stringify({
      siteId: filters?.siteId ?? null,
      siteName: filters?.siteName ?? null,
      userName: filters?.userName ?? null,
      adminName: filters?.adminName ?? null,
      isActive: filters?.isActive ?? null,
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
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.site', 'site')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.admin', 'admin')
      .leftJoinAndSelect('event.banners', 'banners')
      .addSelect(
        `(SELECT COUNT(DISTINCT user_id) FROM site_event_views WHERE event_id = event.id AND user_id IS NOT NULL)`,
        'viewCount',
      )
      .where('event.deletedAt IS NULL');

    // Filter by siteId (UUID or slug)
    if (filters?.siteId) {
      if (isUuid(filters.siteId)) {
        // Filter by site UUID
        queryBuilder.andWhere('event.siteId = :siteId', { siteId: filters.siteId });
      } else {
        // Filter by site slug
        queryBuilder.andWhere('site.slug = :siteSlug', { siteSlug: filters.siteId });
      }
    }

    // Filter by siteName (LIKE search - for admin API)
    if (filters?.siteName) {
      queryBuilder.andWhere('LOWER(site.name) LIKE LOWER(:siteName)', {
        siteName: `%${filters.siteName}%`,
      });
    }

    // Filter by userName (LIKE search - for admin API)
    if (filters?.userName) {
      queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:userName)', {
        userName: `%${filters.userName}%`,
      });
    }

    // Filter by adminName (LIKE search - for admin API)
    if (filters?.adminName) {
      queryBuilder.andWhere('LOWER(admin.displayName) LIKE LOWER(:adminName)', {
        adminName: `%${filters.adminName}%`,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('event.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere('LOWER(event.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    const sortField = `event.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy(`event.${sortBy}`, 'ASC');
      }
      queryBuilder.addOrderBy('event.id', sortOrder);
    }

    if (decodedId) {
      let parsedSortValue: string | number | Date | undefined = decodedSortValue;
      if (decodedSortValue != null && (sortBy === 'startDate' || sortBy === 'createdAt')) {
        parsedSortValue = new Date(decodedSortValue);
      } else if (decodedSortValue != null) {
        parsedSortValue = decodedSortValue;
      }

      if (direction === 'forward') {
        queryBuilder.andWhere('event.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND event.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('event.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('event.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND event.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('event.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('event.id > :cursorId', { cursorId: decodedId });
          }
        }
        if (sortOrder === 'DESC') {
          queryBuilder.orderBy(`event.${sortBy}`, 'ASC').addOrderBy('event.id', 'ASC');
        } else {
          queryBuilder.orderBy(`event.${sortBy}`, 'DESC').addOrderBy('event.id', 'DESC');
        }
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getSortValue = (item: SiteEvent): string | number | Date | undefined => {
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
      // prevCursor must use first item of current page so "previous" returns the full page before
      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
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

  async create(event: Partial<SiteEvent>): Promise<SiteEvent> {
    const eventEntity = this.repository.create(event);
    return this.repository.save(eventEntity);
  }

  async update(id: string, data: Partial<SiteEvent>): Promise<SiteEvent> {
    await this.repository.update(id, data);
    return this.findById(id, ['site', 'user', 'admin', 'banners']);
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
