import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteEvent } from '../../../domain/entities/site-event.entity';
import { ISiteEventRepository } from '../repositories/site-event.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const filterKey = JSON.stringify({ siteId });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    queryBuilder
      .orderBy('event.startDate', 'DESC', 'NULLS LAST')
      .addOrderBy('event.id', 'DESC')
      .skip(offset)
      .take(realLimit + 1);

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

  async findAll(
    filters?: {
      siteId?: string;
      siteName?: string;
      userName?: string;
      adminName?: string;
      isActive?: boolean;
      search?: string;
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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    if (filters?.siteId) {
      if (isUuid(filters.siteId)) {
        queryBuilder.andWhere('event.siteId = :siteId', { siteId: filters.siteId });
      } else {
        queryBuilder.andWhere('site.slug = :siteSlug', { siteSlug: filters.siteId });
      }
    }

    if (filters?.siteName) {
      queryBuilder.andWhere('LOWER(site.name) LIKE LOWER(:siteName)', {
        siteName: `%${filters.siteName}%`,
      });
    }

    if (filters?.userName) {
      queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:userName)', {
        userName: `%${filters.userName}%`,
      });
    }

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

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.addOrderBy(`event.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('event.id', sortOrder).skip(offset).take(realLimit + 1);

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
