import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository, UserFilters } from '../repositories/user.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findByEmail(email: string, relations?: string[]): Promise<User | null> {
    return this.repository.findOne({
      where: { email, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findById(id: string, relations?: string[]): Promise<User | null> {
    // If relations include userBadges.badge, use query builder to filter deleted badges
    if (relations && relations.includes('userBadges.badge')) {
      const queryBuilder = this.repository
        .createQueryBuilder('user')
        .where('user.id = :id', { id })
        .andWhere('user.deletedAt IS NULL');

      // Add all requested relations
      if (relations.includes('userRoles')) {
        queryBuilder.leftJoinAndSelect('user.userRoles', 'userRoles');
      }
      if (relations.includes('userRoles.role')) {
        queryBuilder.leftJoinAndSelect('userRoles.role', 'role');
      }
      if (relations.includes('userBadges')) {
        queryBuilder.leftJoinAndSelect('user.userBadges', 'userBadges');
      }
      if (relations.includes('userBadges.badge')) {
        queryBuilder.leftJoinAndSelect(
          'userBadges.badge',
          'badge',
          'badge.deletedAt IS NULL',
        );
      }
      if (relations.includes('userProfile')) {
        queryBuilder.leftJoinAndSelect('user.userProfile', 'userProfile');
      }

      return queryBuilder.getOne();
    }

    // Otherwise use standard findOne
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findByIdWithBadges(id: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async create(user: User): Promise<User> {
    const entity = this.repository.create(user);
    return this.repository.save(entity);
  }

  async update(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async findAllWithCursor(
    filters?: UserFilters,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<User>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = filters?.sortBy || 'createdAt';
    const sortDir = filters?.sortDir || 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .where('user.deletedAt IS NULL');

    // Search in email or displayName
    if (filters?.search) {
      queryBuilder.andWhere(
        '(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.displayName) LIKE LOWER(:search))',
        {
          search: `%${filters.search}%`,
        },
      );
    } else {
      // Only apply email and displayName filters if search is not provided
      if (filters?.email) {
        queryBuilder.andWhere('LOWER(user.email) LIKE LOWER(:email)', {
          email: `%${filters.email}%`,
        });
      }

      if (filters?.displayName) {
        queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:displayName)', {
          displayName: `%${filters.displayName}%`,
        });
      }
    }

    // Search IP filter - search in user_profile (3 columns: registerIp, lastLoginIp, lastRequestIp)
    if (filters?.searchIp) {
      queryBuilder.andWhere(
        '(LOWER(userProfile.registerIp) LIKE LOWER(:searchIp) OR LOWER(userProfile.lastLoginIp) LIKE LOWER(:searchIp) OR LOWER(userProfile.lastRequestIp) LIKE LOWER(:searchIp))',
        {
          searchIp: `%${filters.searchIp}%`,
        },
      );
    }

    // Status filter (if provided and not empty)
    if (filters?.status && filters.status.trim() !== '') {
      // Assuming status maps to isActive, but can be extended
      if (filters.status.toLowerCase() === 'active' || filters.status === 'true') {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
      } else if (
        filters.status.toLowerCase() === 'inactive' ||
        filters.status === 'false'
      ) {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive: false });
      }
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    // Determine sort field and apply sorting
    if (sortBy === 'points') {
      // Use COALESCE to handle NULL values (treat NULL as 0) for proper sorting
      // Add as select with alias, then order by the alias
      queryBuilder
        .addSelect('COALESCE(userProfile.points, 0)', 'pointsValue')
        .orderBy('pointsValue', sortDir)
        .addOrderBy('user.id', sortDir);
    } else {
      queryBuilder.orderBy(`user.${sortBy}`, sortDir).addOrderBy('user.id', sortDir);
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        // Determine sort field for cursor (same as above)
        let cursorSortField: string;
        if (sortBy === 'points') {
          // Use COALESCE to handle NULL values (treat NULL as 0)
          cursorSortField = 'COALESCE(userProfile.points, 0)';
        } else {
          cursorSortField = `user.${sortBy}`;
        }

        // For DESC order, use < comparison; for ASC, use >
        const comparisonOp = sortDir === 'DESC' ? '<' : '>';
        const idComparisonOp = sortDir === 'DESC' ? '<' : '>';

        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${cursorSortField} ${comparisonOp} :sortValue OR (${cursorSortField} = :sortValue AND user.id ${idComparisonOp} :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere(`user.id ${idComparisonOp} :cursorId`, {
            cursorId: id,
          });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder.take(realLimit + 1);

    // For points sorting, we need to use raw SQL to handle COALESCE properly
    if (sortBy === 'points') {
      // Get the SQL and parameters
      const [sql, parameters] = queryBuilder.getQueryAndParameters();

      // Modify ORDER BY to use COALESCE expression directly
      const orderByExpression = `ORDER BY COALESCE("userProfile"."points", 0) ${sortDir}, "user"."id" ${sortDir}`;
      let modifiedSql = sql;
      if (sql.match(/ORDER BY/i)) {
        modifiedSql = sql.replace(/ORDER BY.*$/i, orderByExpression);
      } else {
        modifiedSql = `${sql} ${orderByExpression}`;
      }

      // Execute the modified query
      const rawResults: Array<Record<string, unknown>> =
        await this.repository.manager.query(modifiedSql, parameters);

      if (rawResults.length === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      // Extract user IDs from raw results
      const userIds: string[] = [];
      const pointsMap = new Map<string, number>();
      for (const row of rawResults) {
        const userId = (row.user_id || row.userId || row.id) as string;
        if (userId && !userIds.includes(userId)) {
          userIds.push(userId);
          const pointsValue =
            (row.pointsValue as number | undefined) ??
            (row.userProfile_points as number | undefined) ??
            0;
          pointsMap.set(userId, pointsValue);
        }
      }

      if (userIds.length === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      // Fetch entities with relations
      const entities = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userProfile', 'userProfile')
        .leftJoinAndSelect('user.userRoles', 'userRoles')
        .leftJoinAndSelect('userRoles.role', 'role')
        .leftJoinAndSelect('user.userBadges', 'userBadges')
        .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
        .where('user.id IN (:...ids)', { ids: userIds })
        .getMany();

      // Sort entities by pointsValue (maintain order from raw query)
      const entityMap = new Map(entities.map((e) => [e.id, e]));
      const sortedEntities = userIds
        .map((id) => entityMap.get(id))
        .filter((e): e is User => e !== undefined);

      const hasMore = sortedEntities.length > realLimit;
      const data = sortedEntities.slice(0, realLimit);

      let nextCursor: string | null = null;
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        const pointsValue = pointsMap.get(lastItem.id) ?? 0;
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, pointsValue);
      }

      return { data, nextCursor, hasMore };
    }

    // For other sort fields, use normal query
    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      let fieldValue: unknown = null;
      if (sortBy === 'points') {
        fieldValue = lastItem.userProfile?.points ?? null;
      } else {
        fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
      }
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue as string | number | Date;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore };
  }
}
