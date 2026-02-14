import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../repositories/site-manager-application.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class SiteManagerApplicationRepository implements ISiteManagerApplicationRepository {
  constructor(
    @InjectRepository(SiteManagerApplication)
    private readonly repository: Repository<SiteManagerApplication>,
  ) {}

  async findById(
    id: string,
    relations?: string[],
  ): Promise<SiteManagerApplication | null> {
    return this.repository.findOne({
      where: { id },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findBySiteAndUser(
    siteId: string,
    userId: string,
    status?: SiteManagerApplicationStatus,
  ): Promise<SiteManagerApplication | null> {
    const where: any = { siteId, userId };
    if (status) {
      where.status = status;
    }
    return this.repository.findOne({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findBySiteId(
    siteId: string,
    status?: SiteManagerApplicationStatus,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteManagerApplication>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.user', 'user')
      .leftJoinAndSelect('app.site', 'site')
      .leftJoinAndSelect('app.admin', 'admin')
      .where('app.siteId = :siteId', { siteId });

    if (status) {
      queryBuilder.andWhere('app.status = :status', { status });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `app.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND app.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND app.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('app.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('app.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`app.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`app.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('app.id', sortOrder);
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

  async findByUserId(
    userId: string,
    status?: SiteManagerApplicationStatus,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteManagerApplication>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';
    const filterKey = JSON.stringify({
      userId,
      status: status ?? null,
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
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.site', 'site')
      .leftJoinAndSelect('app.admin', 'admin')
      .leftJoinAndSelect('app.user', 'user')
      .where('app.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('app.status = :status', { status });
    }

    const sortField = `app.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.addOrderBy(`app.${sortBy}`, sortOrder, 'NULLS LAST');
      queryBuilder.addOrderBy('app.id', sortOrder);
    }

    if (decodedId) {
      if (direction === 'forward') {
        // Move forward (next page): records older than boundary, exclude boundary itself
        queryBuilder.andWhere('app.id != :cursorId', { cursorId: decodedId });
        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND app.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND app.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('app.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('app.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        // Move backward (previous page): records newer than boundary
        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND app.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND app.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('app.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('app.id > :cursorId', { cursorId: decodedId });
          }
        }
        const revOrder = sortOrder === 'DESC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(`app.${sortBy}`, revOrder, 'NULLS LAST');
        queryBuilder.addOrderBy('app.id', revOrder);
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1] as unknown as Record<string, unknown>;
        const fieldValue = lastItem[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined
            ? (fieldValue as string | number | Date)
            : undefined;
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id as string, sortValue, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (decodedId && cursor) {
        previousCursor = CursorPaginationUtil.encodeCursor(decodedId, decodedSortValue, {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      data = data.slice().reverse();
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1] as unknown as Record<string, unknown>;
        const fieldValue = oldestInPage[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined
            ? (fieldValue as string | number | Date)
            : undefined;
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id as string,
          sortValue,
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0] as unknown as Record<string, unknown>;
        const fieldValue = newestInPage[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined
            ? (fieldValue as string | number | Date)
            : undefined;
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id as string,
          sortValue,
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
      previousCursor: previousCursor ?? null,
    };
  }

  async findAll(
    filters?: {
      siteName?: string;
      userId?: string;
      status?: SiteManagerApplicationStatus;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteManagerApplication>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as 'ASC' | 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.user', 'user')
      .leftJoinAndSelect('app.site', 'site')
      .leftJoinAndSelect('app.admin', 'admin');

    if (filters?.siteName) {
      queryBuilder.andWhere('LOWER(site.name) LIKE LOWER(:siteName)', {
        siteName: `%${filters.siteName}%`,
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('app.userId = :userId', { userId: filters.userId });
    }

    if (filters?.status) {
      queryBuilder.andWhere('app.status = :status', { status: filters.status });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `app.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND app.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND app.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('app.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('app.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`app.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`app.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('app.id', sortOrder);
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

  async create(
    application: Partial<SiteManagerApplication>,
  ): Promise<SiteManagerApplication> {
    const entity = this.repository.create(application);
    return this.repository.save(entity);
  }

  async update(
    id: string,
    data: Partial<SiteManagerApplication>,
  ): Promise<SiteManagerApplication> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.SITE_MANAGER_APPLICATION_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
