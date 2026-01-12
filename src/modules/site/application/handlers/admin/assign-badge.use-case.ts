import { Injectable, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteBadgeRepository } from '../../../infrastructure/persistence/repositories/site-badge.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge, BadgeType } from '../../../../badge/domain/entities/badge.entity';
import { SiteBadge } from '../../../domain/entities/site-badge.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface AssignBadgeCommand {
  siteId: string;
  badgeId: string;
}

@Injectable()
export class AssignBadgeToSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteBadgeRepository')
    private readonly siteBadgeRepository: ISiteBadgeRepository,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
  ) {}

  async execute(command: AssignBadgeCommand): Promise<SiteBadge> {
    // Check if site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Check if badge exists, is active, and is of type 'site'
    const badge = await this.badgeRepository.findOne({
      where: {
        id: command.badgeId,
        deletedAt: null,
        isActive: true,
        badgeType: BadgeType.SITE,
      },
    });
    if (!badge) {
      throw badRequest(MessageKeys.BADGE_NOT_FOUND);
    }
    if (badge.badgeType !== BadgeType.SITE) {
      throw badRequest(MessageKeys.BADGE_WRONG_TYPE);
    }

    // Check if already assigned
    const hasBadge = await this.siteBadgeRepository.hasBadge(
      command.siteId,
      command.badgeId,
    );
    if (hasBadge) {
      throw badRequest(MessageKeys.BADGE_ALREADY_ASSIGNED_TO_SITE);
    }

    // Assign badge
    return this.siteBadgeRepository.assignBadge(command.siteId, command.badgeId);
  }
}
