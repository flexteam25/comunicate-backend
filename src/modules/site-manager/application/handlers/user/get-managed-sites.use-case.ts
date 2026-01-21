import { Injectable, Inject } from '@nestjs/common';
import { SiteManager } from '../../../domain/entities/site-manager.entity';
import { Site } from '../../../../site/domain/entities/site.entity';
import { ISiteManagerRepository } from '../../../infrastructure/persistence/repositories/site-manager.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface GetManagedSitesCommand {
  userId: string;
}

export interface GetManagedSiteByIdentifierCommand {
  userId: string;
  siteIdentifier: string;
}

@Injectable()
export class GetManagedSitesUseCase {
  constructor(
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: GetManagedSitesCommand): Promise<SiteManager[]> {
    return this.siteManagerRepository.findByUserId(command.userId);
  }

  async getByIdentifier(command: GetManagedSiteByIdentifierCommand): Promise<Site> {
    const site = await this.siteRepository.findByIdOrSlug(command.siteIdentifier);
    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    const manager = await this.siteManagerRepository.findBySiteAndUser(
      site.id,
      command.userId,
    );

    if (!manager) {
      throw notFound(MessageKeys.NO_PERMISSION_TO_EDIT_SITE);
    }

    return site;
  }
}
