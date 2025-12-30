import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { Site } from '../../../domain/entities/site.entity';

export interface GetSiteCommand {
  siteId: string;
}

@Injectable()
export class GetSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: GetSiteCommand): Promise<Site> {
    const site = await this.siteRepository.findById(command.siteId, [
      'category',
      'tier',
      'siteBadges',
      'siteBadges.badge',
      'siteDomains',
      'siteManagers',
      'siteManagers.user',
    ]);

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }
}
