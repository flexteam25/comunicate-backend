import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import {
  IUserBadgeRequestRepository,
  UserBadgeRequestFilters,
} from '../repositories/user-badge-request.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
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
    });

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
          decodedSortValue = sortValue;
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const sortField = `request.${sortBy}`;
    const sortDefinition = `${sortBy}:${sortOrder},id:${sortOrder}`;

    if (!decodedId || direction === 'forward') {
      queryBuilder
        .addOrderBy(sortField, sortOrder, 'NULLS LAST')
        .addOrderBy('request.id', sortOrder);
    }

    if (decodedId) {
      queryBuilder.andWhere('request.id != :cursorId', { cursorId: decodedId });
      const parsedSortValue =
        decodedSortValue != null && sortBy === 'createdAt'
          ? new Date(decodedSortValue)
          : decodedSortValue;

      if (direction === 'forward') {
        if (parsedSortValue !== null && parsedSortValue !== undefined) {
          if (sortOrder === 'DESC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND request.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND request.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'DESC') {
            queryBuilder.andWhere('request.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('request.id > :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        if (parsedSortValue !== null && parsedSortValue !== undefined) {
          if (sortOrder === 'DESC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND request.id > :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND request.id < :cursorId))`,
              { sortValue: parsedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'DESC') {
            queryBuilder.andWhere('request.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('request.id < :cursorId', { cursorId: decodedId });
          }
        }
        queryBuilder
          .addOrderBy(sortField, sortOrder, 'NULLS LAST')
          .addOrderBy('request.id', sortOrder);
      }
    }

    queryBuilder.take(realLimit + 1);
    const rows = await queryBuilder.getMany();

    const hasMore = rows.length > realLimit;
    let data: UserBadgeRequest[];
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      data = rows.slice(0, realLimit);

      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        const fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined
            ? (fieldValue as string | number | Date)
            : undefined;
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        const fieldValue = (firstItem as unknown as Record<string, unknown>)[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined
            ? (fieldValue as string | number | Date)
            : undefined;
        prevCursor = CursorPaginationUtil.encodeCursor(firstItem.id, sortValue, {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      data = rows.slice(0, realLimit);

      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        const fieldValue = (oldestInPage as unknown as Record<string, unknown>)[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined
            ? (fieldValue as string | number | Date)
            : undefined;
        nextCursor = CursorPaginationUtil.encodeCursor(oldestInPage.id, sortValue, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        const fieldValue = (newestInPage as unknown as Record<string, unknown>)[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined
            ? (fieldValue as string | number | Date)
            : undefined;
        prevCursor = CursorPaginationUtil.encodeCursor(newestInPage.id, sortValue, {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    }

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
