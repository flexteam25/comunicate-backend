import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../../../domain/entities/badge.entity';
import {
  IBadgeRepository,
  BadgeListFilters,
} from '../repositories/badge.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('badge')
      .where('badge.deleted_at IS NULL');

    if (filters?.badgeType) {
      queryBuilder.andWhere('badge.badge_type = :badgeType', {
        badgeType: filters.badgeType,
      });
    }

    if (sortBy === 'order') {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy('badge.order', 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy('badge.order', 'ASC', 'NULLS LAST');
      }
    } else {
      const sortField = `badge.${sortBy}`;
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(sortField, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy(sortField, 'ASC', 'NULLS FIRST');
      }
    }
    queryBuilder.addOrderBy('badge.id', sortOrder).skip(offset).take(realLimit + 1);

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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('badge')
      .withDeleted()
      .where('badge.deleted_at IS NOT NULL');

    if (filters?.badgeType) {
      queryBuilder.andWhere('badge.badge_type = :badgeType', {
        badgeType: filters.badgeType,
      });
    }

    if (sortBy === 'order') {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy('badge.order', 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy('badge.order', 'ASC', 'NULLS LAST');
      }
    } else {
      const sortField = `badge.${sortBy}`;
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(sortField, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy(sortField, 'ASC', 'NULLS FIRST');
      }
    }
    queryBuilder.addOrderBy('badge.id', sortOrder).skip(offset).take(realLimit + 1);

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
