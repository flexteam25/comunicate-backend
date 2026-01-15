import { Inject, Injectable } from '@nestjs/common';
import { IUserFavoriteSiteRepository } from '../../infrastructure/persistence/repositories/user-favorite-site.repository';
import { IUserHistorySiteRepository } from '../../infrastructure/persistence/repositories/user-history-site.repository';
import { IUserSearchSiteRepository } from '../../infrastructure/persistence/repositories/user-search-site.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { Site } from '../../../site/domain/entities/site.entity';

export interface GetActivityCommand {
  userId: string;
}

export interface ActivityResult {
  favorite: Site[];
  recent: Array<{ site: Site; historyId: string; createdAt: Date }>;
  searchHistory: Array<{
    searchQuery: string;
    historyId: string;
    createdAt: Date;
  }>;
}

@Injectable()
export class GetActivityUseCase {
  constructor(
    @Inject('IUserFavoriteSiteRepository')
    private readonly favoriteRepository: IUserFavoriteSiteRepository,
    @Inject('IUserHistorySiteRepository')
    private readonly historyRepository: IUserHistorySiteRepository,
    @Inject('IUserSearchSiteRepository')
    private readonly searchHistoryRepository: IUserSearchSiteRepository,
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

    // Get 20 recent history sites with UUIDs

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const recentHistory = (await this.historyRepository.findRecentHistoryWithIds(
      command.userId,
      20,
    )) as Array<{
      id: string;
      siteId: string;
      createdAt: Date;
    }>;
    const recentSiteIds: string[] = recentHistory.map((item) => item.siteId);
    const recentSites = await this.siteRepository.findByIds(recentSiteIds);

    // Create map to maintain order
    const recentSiteMap = new Map<string, Site>();
    for (const site of recentSites) {
      recentSiteMap.set(site.id, site);
    }

    // Maintain order from recentHistory with UUIDs
    const orderedRecentSites: Array<{
      site: Site;
      historyId: string;
      createdAt: Date;
    }> = recentHistory
      .map((item) => {
        const site = recentSiteMap.get(item.siteId);
        if (!site) return null;
        return {
          site,
          historyId: item.id,
          createdAt: item.createdAt,
        };
      })
      .filter(
        (item): item is { site: Site; historyId: string; createdAt: Date } =>
          item !== null,
      );

    // Get 20 recent search history with UUIDs
    const searchHistoryData =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (await this.searchHistoryRepository.findRecentSearchHistoryWithIds(
        command.userId,
        20,
      )) as Array<{
        id: string;
        searchQuery: string;
        createdAt: Date;
      }>;

    const searchHistory: Array<{
      searchQuery: string;
      historyId: string;
      createdAt: Date;
    }> = searchHistoryData.map((item) => ({
      searchQuery: item.searchQuery,
      historyId: item.id,
      createdAt: item.createdAt,
    }));

    return {
      favorite: orderedFavoriteSites,
      recent: orderedRecentSites,
      searchHistory,
    };
  }
}
