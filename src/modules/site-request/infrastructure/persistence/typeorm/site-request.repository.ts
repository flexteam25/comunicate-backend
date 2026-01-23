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

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = 'request.createdAt';
        if (sortValue !== null && sortValue !== undefined) {
          const sortDate = new Date(sortValue);
          queryBuilder.andWhere(
            `(${sortField} < :sortDate OR (${sortField} = :sortDate AND request.id < :cursorId))`,
            { sortDate, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('request.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('request.createdAt', 'DESC', 'NULLS LAST')
      .addOrderBy('request.id', 'DESC')
      .take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = lastItem.createdAt;
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore };
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
