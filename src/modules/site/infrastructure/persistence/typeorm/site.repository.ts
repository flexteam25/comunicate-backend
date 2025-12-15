import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Site } from '../../../domain/entities/site.entity';
import { ISiteRepository, SiteFilters } from '../repositories/site.repository';
import { CursorPaginationResult, CursorPaginationUtil } from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class SiteRepository implements ISiteRepository {
  constructor(
    @InjectRepository(Site)
    private readonly repository: Repository<Site>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Site | null> {
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

    // Apply filters
    if (filters?.categoryId) {
      queryBuilder.andWhere('site.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters?.tierId) {
      queryBuilder.andWhere('site.tierId = :tierId', { tierId: filters.tierId });
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
    if (filters?.search) {
      queryBuilder.andWhere(
        '(site.name ILIKE :search OR siteDomains.domain ILIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    // Apply cursor pagination
    if (cursor) {
      const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
      const sortField = `site.${sortBy}`;

      if (sortValue) {
        if (sortOrder === 'ASC') {
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
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere('site.id > :cursorId', { cursorId: id });
        } else {
          queryBuilder.andWhere('site.id < :cursorId', { cursorId: id });
        }
      }
    }

    // Apply sorting
    queryBuilder.orderBy(`site.${sortBy}`, sortOrder);
    queryBuilder.addOrderBy('site.id', sortOrder);

    // Load relations
    queryBuilder.leftJoinAndSelect('site.category', 'category');
    queryBuilder.leftJoinAndSelect('site.tier', 'tier');
    queryBuilder.leftJoinAndSelect('site.siteBadges', 'siteBadges');
    queryBuilder.leftJoinAndSelect('siteBadges.badge', 'badge');
    queryBuilder.leftJoinAndSelect('site.siteDomains', 'siteDomains');

    // Fetch one extra to check if there's more
    queryBuilder.take(limit + 1);

    const sites = await queryBuilder.getMany();

    // Check if there's more data
    const hasMore = sites.length > limit;
    const data = hasMore ? sites.slice(0, limit) : sites;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const sortValue = (lastItem as any)[sortBy];
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
}

