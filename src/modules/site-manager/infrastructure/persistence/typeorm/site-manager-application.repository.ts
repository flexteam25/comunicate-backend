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
      hasMore,
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

    const queryBuilder = this.repository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.site', 'site')
      .leftJoinAndSelect('app.admin', 'admin')
      .leftJoinAndSelect('app.user', 'user')
      .where('app.userId = :userId', { userId });

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
      hasMore,
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
      hasMore,
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
