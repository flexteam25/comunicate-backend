import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';
import {
  ISiteRequestRepository,
  SiteRequestFilters,
} from '../repositories/site-request.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class SiteRequestRepository implements ISiteRequestRepository {
  constructor(
    @InjectRepository(SiteRequest)
    private readonly repository: Repository<SiteRequest>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<SiteRequest | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      relations,
    });
  }

  async findByUserId(userId: string, relations?: string[]): Promise<SiteRequest[]> {
    return this.repository.find({
      where: { userId, deletedAt: null },
      relations,
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(
    filters?: SiteRequestFilters,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteRequest>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = 'createdAt';
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      ...filters,
      startDate: filters?.startDate?.toISOString() ?? null,
      endDate: filters?.endDate?.toISOString() ?? null,
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
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.category', 'category')
      .leftJoinAndSelect('request.tier', 'tier')
      .leftJoinAndSelect('request.site', 'site')
      .leftJoinAndSelect('request.admin', 'admin')
      .where('request.deletedAt IS NULL');

    if (filters?.status) {
      queryBuilder.andWhere('request.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('request.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.userName) {
      queryBuilder.andWhere(
        '(LOWER(user.displayName) LIKE LOWER(:userName) OR LOWER(user.email) LIKE LOWER(:userName))',
        {
          userName: `%${filters.userName}%`,
        },
      );
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('request.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('request.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const sortField = `request.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy(`request.${sortBy}`, 'DESC', 'NULLS LAST');
      queryBuilder.addOrderBy('request.id', 'DESC');
    }

    if (decodedId) {
      queryBuilder.andWhere('request.id != :cursorId', { cursorId: decodedId });
      if (decodedSortValue !== undefined) {
        if (direction === 'forward') {
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
        if (direction === 'forward') {
          queryBuilder.andWhere('request.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('request.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy(`request.${sortBy}`, 'DESC', 'NULLS LAST');
        queryBuilder.addOrderBy('request.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    const getSortValue = (item: SiteRequest): string | Date | undefined => {
      const val = item.createdAt;
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
        previousCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
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
        previousCursor = CursorPaginationUtil.encodeCursor(newestInPage.id, getSortValue(newestInPage), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    }

    return { data, nextCursor, previousCursor: previousCursor ?? null };
  }

  async findPendingByName(name: string): Promise<SiteRequest | null> {
    return this.repository
      .createQueryBuilder('request')
      .where('LOWER(request.name) = LOWER(:name)', { name })
      .andWhere("request.status = 'pending'")
      .andWhere('request.deletedAt IS NULL')
      .getOne();
  }

  async findDuplicateName(name: string, excludeId?: string): Promise<SiteRequest | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('request')
      .where('LOWER(request.name) = LOWER(:name)', { name })
      .andWhere("request.status = 'pending'")
      .andWhere('request.deletedAt IS NULL');

    if (excludeId) {
      queryBuilder.andWhere('request.id != :excludeId', { excludeId });
    }

    return queryBuilder.getOne();
  }

  async create(siteRequest: Partial<SiteRequest>): Promise<SiteRequest> {
    const entity = this.repository.create(siteRequest);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<SiteRequest>): Promise<SiteRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Site request not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
