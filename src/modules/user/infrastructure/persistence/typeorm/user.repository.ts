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
    const sortBy = 'createdAt';

    const queryBuilder = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .where('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC');

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

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `user.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND user.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('user.id < :cursorId', {
            cursorId: id,
          });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue as string | number | Date;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore };
  }
}
