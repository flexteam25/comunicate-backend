import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site, TetherDepositWithdrawalStatus } from '../../../domain/entities/site.entity';
import { ISiteRepository, SiteFilters } from '../repositories/site.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class SiteRepository implements ISiteRepository {
  constructor(
    @InjectRepository(Site)
    private readonly repository: Repository<Site>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findById(id: string, _relations?: string[]): Promise<Site | null> {
    // Always use query builder to ensure consistent relationship loading (like findAllWithCursor)
    // Relations parameter is kept for backward compatibility but not used (all relations are always loaded)
    const queryBuilder = this.repository
      .createQueryBuilder('site')
      .where('site.id = :id', { id })
      .andWhere('site.deletedAt IS NULL');

    // Always load core relations (same as findAllWithCursor)
    queryBuilder.leftJoinAndSelect('site.category', 'category');
    queryBuilder.leftJoinAndSelect('site.tier', 'tier');
    queryBuilder.leftJoinAndSelect('site.siteBadges', 'siteBadges');
    queryBuilder.leftJoinAndSelect(
      'siteBadges.badge',
      'badge',
      'badge.deletedAt IS NULL',
    );
    queryBuilder.leftJoinAndSelect('site.siteDomains', 'siteDomains');
    queryBuilder.leftJoinAndSelect(
      'site.siteManagers',
      'siteManagers',
      'siteManagers.isActive = :isActive',
      { isActive: true },
    );
    queryBuilder.leftJoinAndSelect('siteManagers.user', 'managerUser');
    queryBuilder.leftJoinAndSelect('managerUser.userBadges', 'managerUserBadges');
    queryBuilder.leftJoinAndSelect(
      'managerUserBadges.badge',
      'userBadge',
      'userBadge.deletedAt IS NULL',
    );

    queryBuilder.loadRelationCountAndMap(
      'site.issueCount',
      'site.scamReports',
      'scamReport',
      (qb) =>
        qb
          .where('scamReport.deletedAt IS NULL')
          .andWhere("scamReport.status = 'published'"),
    );

    return queryBuilder.getOne();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findByIdOrSlug(identifier: string, _relations?: string[]): Promise<Site | null> {
    // Check if identifier is a UUID format (36 chars with dashes)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );

    const queryBuilder = this.repository
      .createQueryBuilder('site')
      .andWhere('site.deletedAt IS NULL');

    if (isUUID) {
      queryBuilder.where('site.id = :identifier', { identifier });
    } else {
      queryBuilder.where('site.slug = :identifier', { identifier });
    }

    // Always load core relations (same as findAllWithCursor)
    queryBuilder.leftJoinAndSelect('site.category', 'category');
    queryBuilder.leftJoinAndSelect('site.tier', 'tier');
    queryBuilder.leftJoinAndSelect('site.siteBadges', 'siteBadges');
    queryBuilder.leftJoinAndSelect(
      'siteBadges.badge',
      'badge',
      'badge.deletedAt IS NULL',
    );
    queryBuilder.leftJoinAndSelect('site.siteDomains', 'siteDomains');
    queryBuilder.leftJoinAndSelect(
      'site.siteManagers',
      'siteManagers',
      'siteManagers.isActive = :isActive',
      { isActive: true },
    );
    queryBuilder.leftJoinAndSelect('siteManagers.user', 'managerUser');
    queryBuilder.leftJoinAndSelect('managerUser.userBadges', 'managerUserBadges');
    queryBuilder.leftJoinAndSelect(
      'managerUserBadges.badge',
      'userBadge',
      'userBadge.deletedAt IS NULL',
    );

    queryBuilder.loadRelationCountAndMap(
      'site.issueCount',
      'site.scamReports',
      'scamReport',
      (qb) =>
        qb
          .where('scamReport.deletedAt IS NULL')
          .andWhere("scamReport.status = 'published'"),
    );

    return queryBuilder.getOne();
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
    queryBuilder.leftJoinAndSelect(
      'site.siteManagers',
      'siteManagers',
      'siteManagers.isActive = :isActive',
      { isActive: true },
    );
    queryBuilder.leftJoinAndSelect('siteManagers.user', 'managerUser');
    queryBuilder.leftJoinAndSelect('managerUser.userBadges', 'managerUserBadges');
    queryBuilder.leftJoinAndSelect(
      'managerUserBadges.badge',
      'userBadge',
      'userBadge.deletedAt IS NULL',
    );

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
    if (filters?.tether) {
      // Filter by tether deposit/withdrawal status
      queryBuilder.andWhere('site.tetherDepositWithdrawalStatus = :tether', {
        tether: filters.tether,
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

    // If sortOrder is not provided, apply default per sort field
    if (!actualSortOrder) {
      if (actualSortBy === 'tier') {
        // Tier: tier.order ASC
        actualSortOrder = 'ASC';
      } else if (
        actualSortBy === 'createdAt' ||
        actualSortBy === 'reviewCount' ||
        actualSortBy === 'firstCharge' ||
        actualSortBy === 'recharge' ||
        actualSortBy === 'experience'
      ) {
        // createdAt, reviewCount, firstCharge, recharge, experience: DESC
        actualSortOrder = 'DESC';
      } else {
        // Fallback: DESC
        actualSortOrder = 'DESC';
      }
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
    } else if (actualSortBy === 'tether') {
      // Filter by tether deposit/withdrawal status
      queryBuilder.andWhere('site.tetherDepositWithdrawalStatus = :tether', {
        tether: TetherDepositWithdrawalStatus.POSSIBLE,
      });
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

  async findAllDeletedWithCursor(
    filters?: SiteFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<Site>> {
    const queryBuilder = this.repository
      .createQueryBuilder('site')
      .withDeleted()
      .where('site.deleted_at IS NOT NULL');

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
    queryBuilder.leftJoinAndSelect(
      'site.siteManagers',
      'siteManagers',
      'siteManagers.isActive = :isActive',
      { isActive: true },
    );
    queryBuilder.leftJoinAndSelect('siteManagers.user', 'managerUser');
    queryBuilder.leftJoinAndSelect('managerUser.userBadges', 'managerUserBadges');
    queryBuilder.leftJoinAndSelect(
      'managerUserBadges.badge',
      'userBadge',
      'userBadge.deletedAt IS NULL',
    );

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
      queryBuilder.andWhere('site.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(LOWER(site.name) LIKE LOWER(:search) OR LOWER(site.slug) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.categoryType && filters.categoryType !== 'all') {
      // Filter by category type (toto or casino)
      queryBuilder.andWhere('category.type = :categoryType', {
        categoryType: filters.categoryType,
      });
    }
    if (filters?.tether) {
      // Filter by tether deposit/withdrawal status
      queryBuilder.andWhere('site.tetherDepositWithdrawalStatus = :tether', {
        tether: filters.tether,
      });
    }

    if (filters?.filterBy) {
      switch (filters.filterBy) {
        case 'reviewCount':
          queryBuilder.andWhere('site.reviewCount > 0');
          break;
        case 'firstCharge':
          queryBuilder.andWhere('site.firstCharge IS NOT NULL');
          break;
        case 'recharge':
          queryBuilder.andWhere('site.recharge IS NOT NULL');
          break;
        case 'experience':
          queryBuilder.andWhere('site.experience IS NOT NULL');
          break;
      }
    }

    // Handle cursor pagination
    const realLimit = limit > 50 ? 50 : limit;
    const actualSortBy = sortBy === 'tier' ? 'tier.order' : `site.${sortBy}`;

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${actualSortBy} > :sortValue OR (${actualSortBy} = :sortValue AND site.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${actualSortBy} < :sortValue OR (${actualSortBy} = :sortValue AND site.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('site.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('site.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Apply sorting
    if (sortBy === 'tier') {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy('tier.order', 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy('tier.order', 'ASC', 'NULLS FIRST');
      }
    } else {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(`site.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy(`site.${sortBy}`, 'ASC', 'NULLS FIRST');
      }
    }
    queryBuilder.addOrderBy('site.id', sortOrder);

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = hasMore ? entities.slice(0, realLimit) : entities;

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      let sortValue: string | number | Date | null = null;
      if (sortBy === 'tier') {
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
      throw notFound(MessageKeys.SITE_NOT_FOUND_AFTER_UPDATE);
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
    // Return empty array if no IDs provided (prevents SQL syntax error with IN ())
    if (!ids || ids.length === 0) {
      return [];
    }

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
