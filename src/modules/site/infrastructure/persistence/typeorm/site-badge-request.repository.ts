import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import {
  ISiteBadgeRequestRepository,
  SiteBadgeRequestFilters,
} from '../repositories/site-badge-request.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class SiteBadgeRequestRepository implements ISiteBadgeRequestRepository {
  constructor(
    @InjectRepository(SiteBadgeRequest)
    private readonly repository: Repository<SiteBadgeRequest>,
  ) {}

  async create(request: Partial<SiteBadgeRequest>): Promise<SiteBadgeRequest> {
    const entity = this.repository.create(request);
    return this.repository.save(entity);
  }

  async findById(id: string, relations?: string[]): Promise<SiteBadgeRequest | null> {
    return this.repository.findOne({
      where: { id },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findPendingBySiteAndBadge(
    siteId: string,
    badgeId: string,
  ): Promise<SiteBadgeRequest | null> {
    return this.repository.findOne({
      where: {
        siteId,
        badgeId,
        status: SiteBadgeRequestStatus.PENDING,
      },
    });
  }

  async findAllWithCursor(
    filters: SiteBadgeRequestFilters,
    cursor?: string,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<SiteBadgeRequest>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      ...filters,
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
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.site', 'site')
      .leftJoinAndSelect('request.badge', 'badge')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.admin', 'admin')
      .leftJoinAndSelect('request.images', 'images');

    if (filters.siteId) {
      queryBuilder.andWhere('request.siteId = :siteId', { siteId: filters.siteId });
    }

    if (filters.userId) {
      queryBuilder.andWhere('request.userId = :userId', { userId: filters.userId });
    }

    if (filters.badgeId) {
      queryBuilder.andWhere('request.badgeId = :badgeId', { badgeId: filters.badgeId });
    }

    if (filters.status) {
      queryBuilder.andWhere('request.status = :status', { status: filters.status });
    }

    if (filters.siteName) {
      queryBuilder.andWhere('LOWER(site.name) LIKE LOWER(:siteName)', {
        siteName: `%${filters.siteName}%`,
      });
    }

    if (filters.badgeName) {
      queryBuilder.andWhere('LOWER(badge.name) LIKE LOWER(:badgeName)', {
        badgeName: `%${filters.badgeName}%`,
      });
    }

    const sortField = `request.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(`request.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.orderBy(`request.${sortBy}`, 'ASC');
      }
      queryBuilder.addOrderBy('request.id', sortOrder);
    }

    if (decodedId) {
      queryBuilder.andWhere('request.id != :cursorId', { cursorId: decodedId });
      if (direction === 'forward') {
        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND request.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND request.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('request.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('request.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND request.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND request.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('request.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('request.id > :cursorId', { cursorId: decodedId });
          }
        }
        // Use same ORDER as display so result order is correct without reversing
        if (sortOrder === 'DESC') {
          queryBuilder.addOrderBy(`request.${sortBy}`, 'DESC', 'NULLS LAST');
        } else {
          queryBuilder.orderBy(`request.${sortBy}`, 'ASC');
        }
        queryBuilder.addOrderBy('request.id', sortOrder);
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getSortValue = (item: SiteBadgeRequest): string | number | Date | undefined => {
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

  async update(id: string, data: Partial<SiteBadgeRequest>): Promise<SiteBadgeRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['site', 'badge', 'user', 'admin', 'images']);
    if (!updated) {
      throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
