import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import {
  IUserBadgeRequestRepository,
  UserBadgeRequestFilters,
} from '../repositories/user-badge-request.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class UserBadgeRequestRepository implements IUserBadgeRequestRepository {
  constructor(
    @InjectRepository(UserBadgeRequest)
    private readonly repository: Repository<UserBadgeRequest>,
  ) {}

  async create(request: Partial<UserBadgeRequest>): Promise<UserBadgeRequest> {
    const entity = this.repository.create(request);
    return this.repository.save(entity);
  }

  async findById(id: string, relations?: string[]): Promise<UserBadgeRequest | null> {
    return this.repository.findOne({
      where: { id },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findPendingByUserAndBadge(
    userId: string,
    badgeId: string,
  ): Promise<UserBadgeRequest | null> {
    return this.repository.findOne({
      where: {
        userId,
        badgeId,
        status: UserBadgeRequestStatus.PENDING,
      },
    });
  }

  async findAllWithCursor(
    filters: UserBadgeRequestFilters,
    cursor?: string,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<UserBadgeRequest>> {
    const realLimit = limit > 50 ? 50 : limit;

    const filterKey = JSON.stringify({
      userId: filters.userId ?? null,
      badgeId: filters.badgeId ?? null,
      status: filters.status ?? null,
      userName: filters.userName ?? null,
      badgeName: filters.badgeName ?? null,
      sortBy,
      sortOrder,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.badge', 'badge')
      .leftJoinAndSelect('request.admin', 'admin')
      .leftJoinAndSelect('request.images', 'images');

    if (filters.userId) {
      queryBuilder.andWhere('request.userId = :userId', { userId: filters.userId });
    }

    if (filters.badgeId) {
      queryBuilder.andWhere('request.badgeId = :badgeId', { badgeId: filters.badgeId });
    }

    if (filters.status) {
      queryBuilder.andWhere('request.status = :status', { status: filters.status });
    }

    if (filters.userName) {
      queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:userName)', {
        userName: `%${filters.userName}%`,
      });
    }

    if (filters.badgeName) {
      queryBuilder.andWhere('LOWER(badge.name) LIKE LOWER(:badgeName)', {
        badgeName: `%${filters.badgeName}%`,
      });
    }

    const sortField = `request.${sortBy}`;
    queryBuilder
      .orderBy(sortField, sortOrder, 'NULLS LAST')
      .addOrderBy('request.id', sortOrder)
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

  async update(id: string, data: Partial<UserBadgeRequest>): Promise<UserBadgeRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['user', 'badge', 'admin', 'images']);
    if (!updated) {
      throw notFound(MessageKeys.USER_BADGE_REQUEST_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
