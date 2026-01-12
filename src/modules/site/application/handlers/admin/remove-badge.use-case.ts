import { Injectable, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteBadgeRepository } from '../../../infrastructure/persistence/repositories/site-badge.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RemoveBadgeCommand {
  siteId: string;
  badgeId: string;
}

@Injectable()
export class RemoveBadgeFromSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteBadgeRepository')
    private readonly siteBadgeRepository: ISiteBadgeRepository,
  ) {}

  async execute(command: RemoveBadgeCommand): Promise<void> {
    // Check if site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Remove badge
    await this.siteBadgeRepository.removeBadge(command.siteId, command.badgeId);
  }
}
