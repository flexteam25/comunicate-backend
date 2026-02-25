import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site, TetherDepositWithdrawalStatus } from '../../../domain/entities/site.entity';
import { ISiteRepository, SiteFilters } from '../repositories/site.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    sortOrder?: 'ASC' | 'DESC',
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

    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      categoryId: filters?.categoryId ?? null,
      tierId: filters?.tierId ?? null,
      status: filters?.status ?? null,
      search: filters?.search ?? null,
      categoryType: filters?.categoryType ?? null,
      tether: filters?.tether ?? null,
      filterBy: filters?.filterBy ?? null,
      sortBy: actualSortBy,
      sortOrder: actualSortOrder,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const sortField =
      actualSortBy === 'tier' ? 'tier.order' : `site.${actualSortBy}`;

    queryBuilder
      .addOrderBy(sortField, actualSortOrder, 'NULLS LAST')
      .addOrderBy('site.id', actualSortOrder)
      .skip(offset)
      .take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

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

    // Determine sort field and order (align with findAllWithCursor)
    let actualSortBy = sortBy;
    let actualSortOrder = sortOrder;

    if (filters?.filterBy) {
      actualSortBy = filters.filterBy;
      actualSortOrder = 'DESC';
    }
    if (!actualSortOrder) {
      if (actualSortBy === 'tier') {
        actualSortOrder = 'ASC';
      } else {
        actualSortOrder = 'DESC';
      }
    }

    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      categoryId: filters?.categoryId ?? null,
      tierId: filters?.tierId ?? null,
      status: filters?.status ?? null,
      search: filters?.search ?? null,
      categoryType: filters?.categoryType ?? null,
      filterBy: filters?.filterBy ?? null,
      sortBy: actualSortBy,
      sortOrder: actualSortOrder,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    if (actualSortBy === 'tier') {
      if (actualSortOrder === 'DESC') {
        queryBuilder.addOrderBy('tier.order', 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy('tier.order', 'ASC', 'NULLS FIRST');
      }
    } else {
      if (actualSortOrder === 'DESC') {
        queryBuilder.addOrderBy(`site.${actualSortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.addOrderBy(`site.${actualSortBy}`, 'ASC', 'NULLS FIRST');
      }
    }
    queryBuilder.addOrderBy('site.id', actualSortOrder).skip(offset).take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

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
