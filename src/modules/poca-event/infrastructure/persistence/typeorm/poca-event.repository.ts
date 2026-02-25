import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../repositories/poca-event.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    queryBuilder
      .addOrderBy('event.startsAt', 'DESC', 'NULLS LAST')
      .addOrderBy('event.createdAt', 'DESC')
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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    if (sortOrder === 'DESC') {
      idQb.addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      idQb.orderBy(`event.${sortBy}`, 'ASC');
    }
    idQb.addOrderBy('event.id', sortOrder).skip(offset).take(realLimit + 1);
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

    const idToEvent = new Map(entities.map((e) => [e.id, e]));
    const data = pageIds.map((id) => idToEvent.get(id)).filter((e): e is PocaEvent => e != null);

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
