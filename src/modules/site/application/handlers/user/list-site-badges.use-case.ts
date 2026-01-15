import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../../badge/infrastructure/persistence/repositories/badge.repository';
import { ISiteBadgeRepository } from '../../../infrastructure/persistence/repositories/site-badge.repository';
import { Badge } from '../../../../badge/domain/entities/badge.entity';
import { BadgeType } from '../../../../badge/domain/entities/badge.entity';

export interface ListSiteBadgesCommand {
  siteId: string;
}

export interface SiteBadgeWithActive {
  badge: Badge;
  active: boolean;
}

@Injectable()
export class ListSiteBadgesUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    @Inject('ISiteBadgeRepository')
    private readonly siteBadgeRepository: ISiteBadgeRepository,
  ) {}

  async execute(command: ListSiteBadgesCommand): Promise<SiteBadgeWithActive[]> {
    // Get all site badges (not soft deleted)
    const badges = await this.badgeRepository.findAll(
      null, // isActive: null means get all (active and inactive)
      BadgeType.SITE,
      'order',
      'ASC',
    );

    // Get all badges assigned to this site
    const siteBadges = await this.siteBadgeRepository.findBySiteId(command.siteId);
    const assignedBadgeIds = new Set(siteBadges.map((sb) => sb.badgeId));

    // Map badges with active flag
    return badges.map((badge) => ({
      badge,
      active: assignedBadgeIds.has(badge.id),
    }));
  }
}
