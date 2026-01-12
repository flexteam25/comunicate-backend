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

    // Sort by startsAt DESC, then createdAt DESC
    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `event.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND event.id < :cursorId) OR (${sortField} IS NULL AND event.createdAt < :createdAtValue))`,
            {
              sortValue,
              cursorId: id,
              createdAtValue: sortValue,
            },
          );
        } else {
          queryBuilder.andWhere('event.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .addOrderBy(`event.${sortBy}`, 'DESC', 'NULLS LAST')
      .addOrderBy('event.createdAt', 'DESC')
      .addOrderBy('event.id', 'DESC')
      .take(realLimit + 1);

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    const data = result.entities.slice(0, realLimit);
    const rawData = result.raw.slice(0, realLimit);

    // Map viewCount from raw data to entities
    data.forEach((event, index) => {
      (event as any).viewCount = parseInt(rawData[index]?.viewCount || '0', 10);
    });

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
      hasMore,
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
