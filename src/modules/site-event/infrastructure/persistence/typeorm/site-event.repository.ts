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

    // Filter by siteId (UUID or slug)
    if (isUuid(siteId)) {
      // Filter by site UUID
      queryBuilder.andWhere('event.siteId = :siteId', { siteId });
    } else {
      // Filter by site slug
      queryBuilder.andWhere('site.slug = :siteSlug', { siteSlug: siteId });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = 'event.startDate';
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('event.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('event.startDate', 'DESC')
      .addOrderBy('event.id', 'DESC')
      .take(realLimit + 1);

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    const data = result.entities.slice(0, realLimit);

    // Create a map of event.id -> raw data to handle cases where joins create multiple rows per event
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
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const sortValue = lastItem.startDate;
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
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
      queryBuilder.addOrderBy(`event.${sortBy}`, 'ASC');
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
      hasMore,
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
