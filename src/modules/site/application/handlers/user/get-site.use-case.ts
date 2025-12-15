import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteViewRepository } from '../../../infrastructure/persistence/repositories/site-view.repository';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';

export interface GetSiteCommand {
  siteId: string;
  userId?: string;
  ipAddress: string;
}

@Injectable()
export class GetSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteViewRepository')
    private readonly siteViewRepository: ISiteViewRepository,
  ) {}

  async execute(command: GetSiteCommand): Promise<Site> {
    const site = await this.siteRepository.findById(command.siteId, [
      'category',
      'tier',
      'siteBadges',
      'siteBadges.badge',
      'siteDomains',
    ]);

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Only allow viewing verified or monitored sites
    if (site.status !== SiteStatus.VERIFIED && site.status !== SiteStatus.MONITORED) {
      throw new ForbiddenException('Site is not available for viewing');
    }

    // Track view (async, don't wait for it)
    this.siteViewRepository
      .create({
        siteId: command.siteId,
        userId: command.userId,
        ipAddress: command.ipAddress,
      })
      .catch((error) => {
        // Log error but don't fail the request
        console.error('Failed to track site view:', error);
      });

    return site;
  }
}

