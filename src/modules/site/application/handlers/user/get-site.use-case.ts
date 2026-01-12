import { Injectable, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteViewRepository } from '../../../infrastructure/persistence/repositories/site-view.repository';
import { IUserHistorySiteRepository } from '../../../../user/infrastructure/persistence/repositories/user-history-site.repository';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

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
    @Inject('IUserHistorySiteRepository')
    private readonly userHistorySiteRepository: IUserHistorySiteRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: GetSiteCommand): Promise<Site> {
    const site = await this.siteRepository.findByIdOrSlug(command.siteId, [
      'category',
      'tier',
      'siteBadges',
      'siteBadges.badge',
      'siteDomains',
    ]);

    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Only allow viewing verified or monitored sites
    if (site.status !== SiteStatus.VERIFIED && site.status !== SiteStatus.MONITORED) {
      throw forbidden(MessageKeys.SITE_NOT_AVAILABLE_FOR_VIEWING);
    }

    // Track view only for authenticated users (async, don't wait for it)
    if (command.userId) {
      this.siteViewRepository
        .create({
          siteId: command.siteId,
          userId: command.userId,
          ipAddress: command.ipAddress,
        })
        .catch((error) => {
          // Log error but don't fail the request
          this.logger.error(
            'Failed to track site view',
            {
              error: error instanceof Error ? error.message : String(error),
              siteId: command.siteId,
              userId: command.userId,
            },
            'site',
          );
        });
    }

    if (command.userId) {
      // Use site.id (actual UUID) for tracking, not the identifier
      this.userHistorySiteRepository
        .addHistory(command.userId, site.id)
        .catch((error) => {
          // Log error but don't fail the request
          this.logger.error(
            'Failed to save user site history',
            {
              error: error instanceof Error ? error.message : String(error),
              userId: command.userId,
              siteId: site.id,
            },
            'site',
          );
        });
    }

    return site;
  }
}
