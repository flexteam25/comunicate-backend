import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Site } from '../../../domain/entities/site.entity';
import { ISiteRepository, SiteFilters } from '../repositories/site.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class SiteRepository implements ISiteRepository {
  constructor(
    @InjectRepository(Site)
    private readonly repository: Repository<Site>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Site | null> {
    // If relations include siteBadges.badge, use query builder to filter deleted badges
    if (relations && relations.includes('siteBadges.badge')) {
      const queryBuilder = this.repository
        .createQueryBuilder('site')
        .where('site.id = :id', { id })
        .andWhere('site.deletedAt IS NULL');

      // Add all relations
      if (relations.includes('category')) {
        queryBuilder.leftJoinAndSelect('site.category', 'category');
      }
      if (relations.includes('tier')) {
        queryBuilder.leftJoinAndSelect('site.tier', 'tier');
      }
      if (relations.includes('siteBadges')) {
        queryBuilder.leftJoinAndSelect('site.siteBadges', 'siteBadges');
      }
      if (relations.includes('siteBadges.badge')) {
        queryBuilder.leftJoinAndSelect(
          'siteBadges.badge',
          'badge',
          'badge.deletedAt IS NULL',
        );
      }
      if (relations.includes('siteDomains')) {
        queryBuilder.leftJoinAndSelect('site.siteDomains', 'siteDomains');
      }

      return queryBuilder.getOne();
    }

    // Otherwise use standard findOne
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findByIdIncludingDeleted(id: string): Promise<Site | null> {
    return this.repository.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  async findAllWithCursor(
    filters?: SiteFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<Site>> {
    const queryBuilder = this.repository
      .createQueryBuilder('site')
      .where('site.deletedAt IS NULL');

    // Load relations early for filtering
    queryBuilder.leftJoinAndSelect('site.category', 'category');
    queryBuilder.leftJoinAndSelect('site.tier', 'tier');
    queryBuilder.leftJoinAndSelect('site.siteBadges', 'siteBadges');
    queryBuilder.leftJoinAndSelect(
      'siteBadges.badge',
      'badge',
      'badge.deletedAt IS NULL',
    );
    queryBuilder.leftJoinAndSelect('site.siteDomains', 'siteDomains');

    queryBuilder.loadRelationCountAndMap(
      'site.issueCount',
      'site.scamReports',
      'scamReport',
      (qb) =>
        qb
          .where('scamReport.deletedAt IS NULL')
          .andWhere("scamReport.status = 'published'"),
    );

    // Apply filters
    if (filters?.categoryId) {
      queryBuilder.andWhere('site.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters?.tierId) {
      queryBuilder.andWhere('site.tierId = :tierId', {
        tierId: filters.tierId,
      });
    }
    if (filters?.status) {
      // Support comma-separated statuses or single status
      const statuses = filters.status.split(',').map((s) => s.trim());
      if (statuses.length === 1) {
        queryBuilder.andWhere('site.status = :status', { status: statuses[0] });
      } else {
        queryBuilder.andWhere('site.status IN (:...statuses)', { statuses });
      }
    }
    if (filters?.categoryType && filters.categoryType !== 'all') {
      // Filter by category name (toto or casino) - case insensitive
      queryBuilder.andWhere('LOWER(category.name) = LOWER(:categoryType)', {
        categoryType: filters.categoryType,
      });
    }
    if (filters?.search) {
      queryBuilder.andWhere(
        '(site.name ILIKE :search OR siteDomains.domain ILIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    // Determine sort field and order
    let actualSortBy = sortBy;
    let actualSortOrder = sortOrder;

    // If filterBy is specified, override sortBy to use that field (highest = DESC)
    if (filters?.filterBy) {
      actualSortBy = filters.filterBy;
      actualSortOrder = 'DESC'; // Always DESC for "highest" filters
    }

    // Handle tier sorting (sort by tier.order)
    if (actualSortBy === 'tier') {
      // Apply cursor pagination for tier sorting
      if (cursor) {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue !== null && sortValue !== undefined) {
          const tierOrder = parseFloat(sortValue);
          if (actualSortOrder === 'ASC') {
            queryBuilder.andWhere(
              '(tier.order > :tierOrder OR (tier.order = :tierOrder AND site.id > :cursorId) OR (tier.order IS NULL AND site.id > :cursorId))',
              { tierOrder, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              '(tier.order < :tierOrder OR (tier.order = :tierOrder AND site.id < :cursorId) OR (tier.order IS NULL AND site.id < :cursorId))',
              { tierOrder, cursorId: id },
            );
          }
        } else {
          if (actualSortOrder === 'ASC') {
            queryBuilder.andWhere('site.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('site.id < :cursorId', { cursorId: id });
          }
        }
      }
      if (actualSortOrder === 'DESC') {
        queryBuilder.addOrderBy(`site.${actualSortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.orderBy('tier.order', 'ASC');
      }
      queryBuilder.addOrderBy('site.id', actualSortOrder);
    } else {
      // Apply cursor pagination
      if (cursor) {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `site.${actualSortBy}`;

        if (sortValue !== null && sortValue !== undefined) {
          if (actualSortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND site.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND site.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (actualSortOrder === 'ASC') {
            queryBuilder.andWhere('site.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('site.id < :cursorId', { cursorId: id });
          }
        }
      }

      // Apply sorting with NULLS LAST for DESC
      if (actualSortOrder === 'DESC') {
        queryBuilder.addOrderBy(`site.${actualSortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.orderBy(`site.${actualSortBy}`, 'ASC');
      }
      queryBuilder.addOrderBy('site.id', actualSortOrder);
    }

    // Fetch one extra to check if there's more
    queryBuilder.take(limit + 1);

    const sites = await queryBuilder.getMany();

    // issueCount is automatically loaded by loadRelationCountAndMap
    // Check if there's more data
    const hasMore = sites.length > limit;
    const data = hasMore ? sites.slice(0, limit) : sites;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      let sortValue: string | number | Date | null = null;
      if (actualSortBy === 'tier') {
        sortValue = lastItem.tier?.order ?? null;
      } else {
        const fieldValue = (lastItem as unknown as Record<string, unknown>)[actualSortBy];
        if (fieldValue !== null && fieldValue !== undefined) {
          sortValue = fieldValue as string | number | Date;
        }
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async create(site: Partial<Site>): Promise<Site> {
    const entity = this.repository.create(site);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<Site>): Promise<Site> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Site not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }

  async findByCategory(categoryId: string): Promise<Site[]> {
    return this.repository.find({
      where: { categoryId, deletedAt: null },
    });
  }

  async findByTier(tierId: string): Promise<Site[]> {
    return this.repository.find({
      where: { tierId, deletedAt: null },
    });
  }

  async findByIds(ids: string[]): Promise<Site[]> {
    return this.repository
      .createQueryBuilder('site')
      .leftJoinAndSelect('site.category', 'category')
      .leftJoinAndSelect('site.tier', 'tier')
      .leftJoinAndSelect('site.siteBadges', 'siteBadges')
      .leftJoinAndSelect('siteBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('site.siteDomains', 'siteDomains')
      .where('site.id IN (:...ids)', { ids })
      .andWhere('site.deletedAt IS NULL')
      .getMany();
  }
}
