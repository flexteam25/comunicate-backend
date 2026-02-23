import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../../../domain/entities/badge.entity';
import {
  IBadgeRepository,
  BadgeListFilters,
} from '../repositories/badge.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class BadgeRepository implements IBadgeRepository {
  constructor(
    @InjectRepository(Badge)
    private readonly repository: Repository<Badge>,
  ) {}

  async findAll(
    isActive: number | null = null,
    badgeType?: string,
    sortBy: string = 'name',
    sortDir: 'ASC' | 'DESC' = 'ASC',
  ): Promise<Badge[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('badge')
      .where('badge.deleted_at IS NULL');

    if (isActive === 1) {
      queryBuilder.andWhere('badge.is_active = :isActive', { isActive: true });
    } else if (isActive === 0) {
      queryBuilder.andWhere('badge.is_active = :isActive', { isActive: false });
    }

    if (badgeType) {
      queryBuilder.andWhere('badge.badge_type = :badgeType', { badgeType });
    }

    // Handle sorting
    if (sortBy === 'order') {
      if (sortDir === 'DESC') {
        queryBuilder.addOrderBy('badge.order', 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy('badge.order', 'ASC', 'NULLS LAST');
      }
    } else {
      if (sortDir === 'DESC') {
        queryBuilder.addOrderBy(`badge.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy(`badge.${sortBy}`, 'ASC', 'NULLS FIRST');
      }
    }

    // Secondary sort by name for stable ordering
    queryBuilder.addOrderBy('badge.name', 'ASC');

    return queryBuilder.getMany();
  }

  async findAllWithCursor(
    filters?: BadgeListFilters,
    cursor?: string,
    limit: number = 20,
  ): Promise<CursorPaginationResult<Badge>> {
    const sortBy = filters?.sortBy ?? 'name';
    const sortOrder = (filters?.sortDir ?? 'ASC') as 'ASC' | 'DESC';
    const realLimit = Math.min(Math.max(1, limit), 50);
    const filterKey = JSON.stringify({
      badgeType: filters?.badgeType ?? null,
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
      .createQueryBuilder('badge')
      .where('badge.deleted_at IS NULL');

    if (filters?.badgeType) {
      queryBuilder.andWhere('badge.badge_type = :badgeType', {
        badgeType: filters.badgeType,
      });
    }

    const sortField = `badge.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      if (sortBy === 'order') {
        if (sortOrder === 'DESC') {
          queryBuilder.addOrderBy('badge.order', 'DESC', 'NULLS LAST');
        } else {
          queryBuilder.addOrderBy('badge.order', 'ASC', 'NULLS LAST');
        }
      } else {
        if (sortOrder === 'DESC') {
          queryBuilder.addOrderBy(sortField, 'DESC', 'NULLS LAST');
        } else {
          queryBuilder.addOrderBy(sortField, 'ASC', 'NULLS FIRST');
        }
      }
      queryBuilder.addOrderBy('badge.id', sortOrder);
    }

    if (decodedId) {
      let parsedSortValue: string | number | Date | undefined = decodedSortValue;
      if (decodedSortValue != null) {
        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          parsedSortValue = new Date(decodedSortValue);
        } else if (sortBy === 'order') {
          const n = parseFloat(decodedSortValue);
          parsedSortValue = Number.isNaN(n) ? undefined : n;
        } else {
          parsedSortValue = decodedSortValue;
        }
      }

      if (direction === 'forward') {
        queryBuilder.andWhere('badge.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND badge.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND badge.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('badge.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('badge.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND badge.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND badge.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('badge.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('badge.id > :cursorId', { cursorId: decodedId });
          }
        }
        if (sortOrder === 'DESC') {
          queryBuilder.orderBy(sortField, 'ASC').addOrderBy('badge.id', 'ASC');
        } else {
          queryBuilder.orderBy(sortField, 'DESC').addOrderBy('badge.id', 'DESC');
        }
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    const getSortValue = (item: Badge): string | number | Date | undefined => {
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
        previousCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      data = data.slice().reverse();
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id,
          getSortValue(oldestInPage),
          { direction: 'forward', sort: sortDefinition, filterKey },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getSortValue(newestInPage),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    }

    return {
      data,
      nextCursor,
      previousCursor: previousCursor ?? null,
    };
  }

  async findAllIncludeDeleted(
    isActive: number | null = null,
    badgeType?: string,
  ): Promise<Badge[]> {
    const where: Record<string, any> = {};
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;
    if (badgeType) where.badgeType = badgeType;

    return this.repository.find({
      where,
      withDeleted: true,
      order: { name: 'ASC' },
    });
  }

  async findAllDeleted(
    isActive: number | null = null,
    badgeType?: string,
    sortBy: string = 'name',
    sortDir: 'ASC' | 'DESC' = 'ASC',
  ): Promise<Badge[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('badge')
      .withDeleted()
      .where('badge.deleted_at IS NOT NULL');

    if (isActive === 1) {
      queryBuilder.andWhere('badge.is_active = :isActive', { isActive: true });
    } else if (isActive === 0) {
      queryBuilder.andWhere('badge.is_active = :isActive', { isActive: false });
    }

    if (badgeType) {
      queryBuilder.andWhere('badge.badge_type = :badgeType', { badgeType });
    }

    // Handle sorting
    if (sortBy === 'order') {
      if (sortDir === 'DESC') {
        queryBuilder.addOrderBy('badge.order', 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy('badge.order', 'ASC', 'NULLS LAST');
      }
    } else {
      if (sortDir === 'DESC') {
        queryBuilder.addOrderBy(`badge.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy(`badge.${sortBy}`, 'ASC', 'NULLS FIRST');
      }
    }

    // Secondary sort by name for stable ordering
    queryBuilder.addOrderBy('badge.name', 'ASC');

    return queryBuilder.getMany();
  }

  async findAllDeletedWithCursor(
    filters?: BadgeListFilters,
    cursor?: string,
    limit: number = 20,
  ): Promise<CursorPaginationResult<Badge>> {
    const sortBy = filters?.sortBy ?? 'name';
    const sortOrder = (filters?.sortDir ?? 'ASC') as 'ASC' | 'DESC';
    const realLimit = Math.min(Math.max(1, limit), 50);
    const filterKey = JSON.stringify({
      badgeType: filters?.badgeType ?? null,
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
      .createQueryBuilder('badge')
      .withDeleted()
      .where('badge.deleted_at IS NOT NULL');

    if (filters?.badgeType) {
      queryBuilder.andWhere('badge.badge_type = :badgeType', {
        badgeType: filters.badgeType,
      });
    }

    const sortField = `badge.${sortBy}`;

    if (!decodedId || direction === 'forward') {
      if (sortBy === 'order') {
        if (sortOrder === 'DESC') {
          queryBuilder.addOrderBy('badge.order', 'DESC', 'NULLS LAST');
        } else {
          queryBuilder.addOrderBy('badge.order', 'ASC', 'NULLS LAST');
        }
      } else {
        if (sortOrder === 'DESC') {
          queryBuilder.addOrderBy(sortField, 'DESC', 'NULLS LAST');
        } else {
          queryBuilder.addOrderBy(sortField, 'ASC', 'NULLS FIRST');
        }
      }
      queryBuilder.addOrderBy('badge.id', sortOrder);
    }

    if (decodedId) {
      let parsedSortValue: string | number | Date | undefined = decodedSortValue;
      if (decodedSortValue != null) {
        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          parsedSortValue = new Date(decodedSortValue);
        } else if (sortBy === 'order') {
          const n = parseFloat(decodedSortValue);
          parsedSortValue = Number.isNaN(n) ? undefined : n;
        } else {
          parsedSortValue = decodedSortValue;
        }
      }

      if (direction === 'forward') {
        queryBuilder.andWhere('badge.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND badge.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND badge.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('badge.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('badge.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (parsedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND badge.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND badge.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('badge.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('badge.id > :cursorId', { cursorId: decodedId });
          }
        }
        if (sortOrder === 'DESC') {
          queryBuilder.orderBy(sortField, 'ASC').addOrderBy('badge.id', 'ASC');
        } else {
          queryBuilder.orderBy(sortField, 'DESC').addOrderBy('badge.id', 'DESC');
        }
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    const getSortValue = (item: Badge): string | number | Date | undefined => {
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
        previousCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      data = data.slice().reverse();
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id,
          getSortValue(oldestInPage),
          { direction: 'forward', sort: sortDefinition, filterKey },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getSortValue(newestInPage),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    }

    return {
      data,
      nextCursor,
      previousCursor: previousCursor ?? null,
    };
  }

  async findById(id: string, isActive: number | null = null): Promise<Badge | null> {
    const where: Record<string, any> = { id, deletedAt: null };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.findOne({
      where,
    });
  }

  async findByIdIncludingDeleted(
    id: string,
    isActive: number | null = null,
  ): Promise<Badge | null> {
    const where: Record<string, any> = { id };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.findOne({
      where,
      withDeleted: true,
    });
  }

  async create(badge: Partial<Badge>): Promise<Badge> {
    const entity = this.repository.create(badge);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<Badge>): Promise<Badge> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.BADGE_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }
}
