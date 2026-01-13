import { Injectable, Inject } from '@nestjs/common';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { ISiteBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/site-badge-request.repository';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteBadgeRepository } from '../../../infrastructure/persistence/repositories/site-badge.repository';
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import { IBadgeRepository } from '../../../../badge/infrastructure/persistence/repositories/badge.repository';
import { BadgeType } from '../../../../badge/domain/entities/badge.entity';
import {
  badRequest,
  conflict,
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CreateBadgeRequestCommand {
  userId: string;
  siteId: string;
  badgeId: string;
}

@Injectable()
export class CreateBadgeRequestUseCase {
  constructor(
    @Inject('ISiteBadgeRequestRepository')
    private readonly badgeRequestRepository: ISiteBadgeRequestRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteBadgeRepository')
    private readonly siteBadgeRepository: ISiteBadgeRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async execute(command: CreateBadgeRequestCommand): Promise<SiteBadgeRequest> {
    // Validate site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Check if user is a manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      command.siteId,
      command.userId,
    );
    if (!manager) {
      throw forbidden(MessageKeys.PERMISSION_DENIED);
    }

    // Validate badge exists and has type SITE
    const badge = await this.badgeRepository.findById(command.badgeId);
    if (!badge) {
      throw notFound(MessageKeys.BADGE_NOT_FOUND);
    }
    if (badge.badgeType !== BadgeType.SITE) {
      throw badRequest(MessageKeys.BADGE_WRONG_TYPE);
    }

    // Check if site already has this badge
    const hasBadge = await this.siteBadgeRepository.hasBadge(command.siteId, command.badgeId);
    if (hasBadge) {
      throw conflict(MessageKeys.BADGE_ALREADY_ASSIGNED_TO_SITE);
    }

    // Check if there's already a pending request for this badge
    const existingPending = await this.badgeRequestRepository.findPendingBySiteAndBadge(
      command.siteId,
      command.badgeId,
    );
    if (existingPending) {
      throw conflict(MessageKeys.PENDING_BADGE_REQUEST_EXISTS);
    }

    // Create request
    const request = await this.badgeRequestRepository.create({
      siteId: command.siteId,
      badgeId: command.badgeId,
      userId: command.userId,
      status: SiteBadgeRequestStatus.PENDING,
    });

    // Reload with relations
    const reloaded = await this.badgeRequestRepository.findById(request.id, [
      'site',
      'badge',
      'user',
    ]);

    if (!reloaded) {
      throw notFound(MessageKeys.SITE_BADGE_REQUEST_NOT_FOUND_AFTER_CREATE);
    }

    return reloaded;
  }
}
