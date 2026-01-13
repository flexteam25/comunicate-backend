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

    const queryBuilder = this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.site', 'site')
      .leftJoinAndSelect('request.badge', 'badge')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.admin', 'admin');

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

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `request.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND request.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND request.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('request.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('request.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`request.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`request.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('request.id', sortOrder);
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

  async update(id: string, data: Partial<SiteBadgeRequest>): Promise<SiteBadgeRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['site', 'badge', 'user', 'admin']);
    if (!updated) {
      throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
