import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../../user/domain/entities/user.entity';
import { Role } from '../../../../user/domain/entities/role.entity';
import { SiteManager } from '../../../../site-manager/domain/entities/site-manager.entity';
import { Site } from '../../../../site/domain/entities/site.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';

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
    const filterKey = FILTER_KEY;
    const { offset } = decodeOffsetCursor({ cursor: command.cursor, filterKey });

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
      .leftJoinAndSelect('userRoles.role', 'role')
      .orderBy(`user.${SORT_BY}`, SORT_ORDER, 'NULLS LAST')
      .addOrderBy('user.id', SORT_ORDER)
      .skip(offset)
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

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return { data, nextCursor, prevCursor, sitesByUserId };
  }
}
