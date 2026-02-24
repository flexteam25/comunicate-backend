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

const SORT_BY = 'createdAt';
const SORT_ORDER = 'DESC' as const;
const FILTER_KEY = 'partner-users';

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
    const hasCursor =
      command.cursor != null &&
      command.cursor !== '' &&
      command.cursor !== 'null' &&
      command.cursor !== 'undefined';
    const filterKey = FILTER_KEY;
    const sortDefinition = `${SORT_BY}:${SORT_ORDER},id:${SORT_ORDER}`;

    let decodedId: string | undefined;
    let decodedSortValue: string | undefined;
    let direction: 'forward' | 'backward' = 'forward';

    if (hasCursor) {
      try {
        const {
          id,
          sortValue,
          direction: decodedDirection,
          filterKey: cursorFilterKey,
        } = CursorPaginationUtil.decodeCursor(command.cursor);
        if (cursorFilterKey && cursorFilterKey !== filterKey) {
          decodedId = undefined;
          decodedSortValue = undefined;
        } else {
          decodedId = id;
          if (sortValue !== null && sortValue !== undefined) {
            decodedSortValue = sortValue;
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Find partner role
    const partnerRole = await this.roleRepository.findOne({
      where: { name: 'partner', deletedAt: null },
    });

    if (!partnerRole) {
      return { data: [], nextCursor: null, prevCursor: null, sitesByUserId: {} };
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

    if (decodedId) {
      let parsedSortValue: Date | undefined;
      if (decodedSortValue != null) {
        parsedSortValue = new Date(decodedSortValue);
      }

      if (direction === 'forward') {
        queryBuilder
          .orderBy(`user.${SORT_BY}`, SORT_ORDER, 'NULLS LAST')
          .addOrderBy('user.id', SORT_ORDER);
        queryBuilder.andWhere('user.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          queryBuilder.andWhere(
            `(user.${SORT_BY} < :sortValue OR (user.${SORT_BY} = :sortValue AND user.id < :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('user.id < :cursorId', { cursorId: decodedId });
        }
      } else {
        // Always exclude the cursor row itself to avoid boundary glitches
        // (e.g., timestamp precision differences making the cursor row re-appear).
        queryBuilder.andWhere('user.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          queryBuilder.andWhere(
            `(user.${SORT_BY} > :sortValue OR (user.${SORT_BY} = :sortValue AND user.id > :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('user.id > :cursorId', { cursorId: decodedId });
        }
        // For backward paging (previous page / newer records), query ASC and reverse the page
        // so that API output stays consistently sorted DESC.
        queryBuilder
          .orderBy(`user.${SORT_BY}`, 'ASC', 'NULLS LAST')
          .addOrderBy('user.id', 'ASC');
      }
    }

    if (!decodedId) {
      queryBuilder
        .orderBy(`user.${SORT_BY}`, SORT_ORDER, 'NULLS LAST')
        .addOrderBy('user.id', SORT_ORDER);
    }

    queryBuilder.take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);
    if (decodedId && direction === 'backward') {
      data = data.reverse();
    }

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
    let prevCursor: string | null = null;

    const getSortValue = (item: User): Date => item.createdAt;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          lastItem.id,
          getSortValue(lastItem),
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
      if (decodedId && hasCursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          firstItem.id,
          getSortValue(firstItem),
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    } else {
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id,
          getSortValue(oldestInPage),
          { direction: 'forward', sort: sortDefinition, filterKey },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getSortValue(newestInPage),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    }

    return { data, nextCursor, prevCursor, sitesByUserId };
  }
}
