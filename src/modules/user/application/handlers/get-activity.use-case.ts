import { Inject, Injectable } from '@nestjs/common';
import { IUserFavoriteSiteRepository } from '../../infrastructure/persistence/repositories/user-favorite-site.repository';
import { IUserHistorySiteRepository } from '../../infrastructure/persistence/repositories/user-history-site.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { Site } from '../../../site/domain/entities/site.entity';

export interface GetActivityCommand {
  userId: string;
}

export interface ActivityResult {
  favorite: Site[];
  recent: Site[];
}

@Injectable()
export class GetActivityUseCase {
  constructor(
    @Inject('IUserFavoriteSiteRepository')
    private readonly favoriteRepository: IUserFavoriteSiteRepository,
    @Inject('IUserHistorySiteRepository')
    private readonly historyRepository: IUserHistorySiteRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: GetActivityCommand): Promise<ActivityResult> {
    // Get 20 favorite sites
    const favoriteResult = await this.favoriteRepository.listFavorites(
      { userId: command.userId },
      undefined,
      20,
    );
    const favoriteSiteIds = favoriteResult.data.map((item) => item.siteId);
    const favoriteSites = await this.siteRepository.findByIds(favoriteSiteIds);

    // Create map to maintain order
    const favoriteSiteMap = new Map<string, Site>();
    for (const site of favoriteSites) {
      favoriteSiteMap.set(site.id, site);
    }

    // Maintain order from favoriteResult
    const orderedFavoriteSites = favoriteSiteIds
      .map((id) => favoriteSiteMap.get(id))
      .filter((site): site is Site => site !== undefined);

    // Get 20 recent history sites
    const recentHistory = await this.historyRepository.findRecentHistory(command.userId, 20);
    const recentSiteIds = recentHistory.map((item) => item.siteId);
    const recentSites = await this.siteRepository.findByIds(recentSiteIds);

    // Create map to maintain order
    const recentSiteMap = new Map<string, Site>();
    for (const site of recentSites) {
      recentSiteMap.set(site.id, site);
    }

    // Maintain order from recentHistory
    const orderedRecentSites = recentSiteIds
      .map((id) => recentSiteMap.get(id))
      .filter((site): site is Site => site !== undefined);

    return {
      favorite: orderedFavoriteSites,
      recent: orderedRecentSites,
    };
  }
}
