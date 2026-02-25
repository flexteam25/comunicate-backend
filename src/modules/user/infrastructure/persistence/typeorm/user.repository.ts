import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository, UserFilters } from '../repositories/user.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';

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

  async findByIds(ids: string[], relations?: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.repository.find({
      where: { id: In(ids), deletedAt: null },
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
    const sortDir = (filters?.sortDir || 'DESC') as 'ASC' | 'DESC';
    const filterKey = JSON.stringify({
      search: filters?.search ?? null,
      email: filters?.search ? null : (filters?.email ?? null),
      displayName: filters?.search ? null : (filters?.displayName ?? null),
      searchIp: filters?.searchIp ?? null,
      status: filters?.status ?? null,
      isActive: filters?.isActive ?? null,
      sortBy,
      sortDir,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    if (filters?.searchIp) {
      queryBuilder.andWhere(
        '(LOWER(userProfile.registerIp) LIKE LOWER(:searchIp) OR LOWER(userProfile.lastLoginIp) LIKE LOWER(:searchIp) OR LOWER(userProfile.lastRequestIp) LIKE LOWER(:searchIp))',
        {
          searchIp: `%${filters.searchIp}%`,
        },
      );
    }

    if (filters?.status && filters.status.trim() !== '') {
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

    if (sortBy === 'points') {
      queryBuilder
        .addSelect('COALESCE(userProfile.points, 0)', 'pointsValue')
        .orderBy('pointsValue', sortDir)
        .addOrderBy('user.id', sortDir)
        .skip(offset)
        .take(realLimit + 1);

      const [sql, parameters] = queryBuilder.getQueryAndParameters();
      const orderByExpression = `ORDER BY COALESCE("userProfile"."points", 0) ${sortDir}, "user"."id" ${sortDir}`;
      let modifiedSql = sql;
      if (sql.match(/ORDER BY/i)) {
        modifiedSql = sql.replace(/ORDER BY.*$/i, orderByExpression);
      } else {
        modifiedSql = `${sql} ${orderByExpression}`;
      }

      const rawResults: Array<Record<string, unknown>> =
        await this.repository.manager.query(modifiedSql, parameters);

      if (rawResults.length === 0) {
        return { data: [], nextCursor: null, prevCursor: null };
      }

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
        return { data: [], nextCursor: null, prevCursor: null };
      }

      const entities = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userProfile', 'userProfile')
        .leftJoinAndSelect('user.userRoles', 'userRoles')
        .leftJoinAndSelect('userRoles.role', 'role')
        .leftJoinAndSelect('user.userBadges', 'userBadges')
        .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
        .where('user.id IN (:...ids)', { ids: userIds })
        .getMany();

      const entityMap = new Map(entities.map((e) => [e.id, e]));
      const sortedEntities = userIds
        .map((id) => entityMap.get(id))
        .filter((e): e is User => e !== undefined);

      const hasMore = sortedEntities.length > realLimit;
      const data = sortedEntities.slice(0, realLimit);

      const nextCursor = hasMore
        ? encodeOffsetCursor(offset + realLimit, { filterKey })
        : null;
      const prevCursor =
        offset > 0
          ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
          : null;

      return { data, nextCursor, prevCursor: prevCursor ?? null };
    }

    queryBuilder.orderBy(`user.${sortBy}`, sortDir).addOrderBy('user.id', sortDir);
    queryBuilder.skip(offset).take(realLimit + 1);

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

    return { data, nextCursor, prevCursor: prevCursor ?? null };
  }
}
