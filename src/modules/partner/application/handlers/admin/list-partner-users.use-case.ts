import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../../user/domain/entities/user.entity';
import { Role } from '../../../../user/domain/entities/role.entity';
import { SiteManager } from '../../../../site-manager/domain/entities/site-manager.entity';
import { Site } from '../../../../site/domain/entities/site.entity';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

export interface ListPartnerUsersCommand {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListPartnerUsersUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(SiteManager)
    private readonly siteManagerRepository: Repository<SiteManager>,
  ) {}

  async execute(command: ListPartnerUsersCommand): Promise<
    CursorPaginationResult<User> & {
      sitesByUserId: Record<string, Site[]>;
    }
  > {
    const realLimit = command.limit && command.limit > 100 ? 100 : command.limit || 20;

    // Find partner role
    const partnerRole = await this.roleRepository.findOne({
      where: { name: 'partner', deletedAt: null },
    });

    if (!partnerRole) {
      return { data: [], nextCursor: null, hasMore: false, sitesByUserId: {} };
    }

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRole')
      .where('userRole.roleId = :roleId', { roleId: partnerRole.id })
      .andWhere('user.deletedAt IS NULL')
      .andWhere('userRole.createdAt IS NOT NULL')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role');

    if (command.cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(command.cursor);
        const sortField = 'user.createdAt';
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND user.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('user.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('user.createdAt', 'DESC', 'NULLS LAST')
      .addOrderBy('user.id', 'DESC')
      .take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    // Load managed sites for the returned partner users (batch, no N+1)
    const sitesByUserId: Record<string, Site[]> = {};
    const userIds = data.map((u) => u.id);
    if (userIds.length > 0) {
      const siteManagers = await this.siteManagerRepository
        .createQueryBuilder('sm')
        .innerJoinAndSelect('sm.site', 'site')
        .leftJoinAndSelect('site.category', 'category')
        .leftJoinAndSelect('site.tier', 'tier')
        .where('sm.userId IN (:...userIds)', { userIds })
        .andWhere('sm.isActive = true')
        .andWhere('site.deletedAt IS NULL')
        .getMany();

      for (const sm of siteManagers) {
        if (!sm.site) continue;
        if (!sitesByUserId[sm.userId]) sitesByUserId[sm.userId] = [];
        sitesByUserId[sm.userId].push(sm.site);
      }
    }

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = lastItem.createdAt;
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        // Use ISO string to ensure PostgreSQL can parse the timestamp correctly
        sortValue =
          fieldValue instanceof Date ? fieldValue.toISOString() : String(fieldValue);
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore, sitesByUserId };
  }
}
