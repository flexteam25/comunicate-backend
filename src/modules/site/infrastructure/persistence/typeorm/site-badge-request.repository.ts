import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import {
  ISiteBadgeRequestRepository,
  SiteBadgeRequestFilters,
} from '../repositories/site-badge-request.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`request.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`request.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('request.id', sortOrder).skip(offset).take(realLimit + 1);

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

  async update(id: string, data: Partial<SiteBadgeRequest>): Promise<SiteBadgeRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['site', 'badge', 'user', 'admin', 'images']);
    if (!updated) {
      throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
