import { Inject, Injectable } from '@nestjs/common';
import { IUserFavoriteSiteRepository } from '../../infrastructure/persistence/repositories/user-favorite-site.repository';
import { ISiteRepository } from '../../../site/infrastructure/persistence/repositories/site.repository';
import { Site } from '../../../site/domain/entities/site.entity';

export interface ListFavoriteSitesCommand {
  userId: string;
  cursor?: string;
  limit?: number;
}

export interface FavoriteSiteItem {
  id: string;
  site: Site;
  createdAt: Date;
}

export interface ListFavoriteSitesResult {
  data: FavoriteSiteItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ListFavoriteSitesUseCase {
  constructor(
    @Inject('IUserFavoriteSiteRepository')
    private readonly favoriteRepository: IUserFavoriteSiteRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: ListFavoriteSitesCommand): Promise<ListFavoriteSitesResult> {
    const realLimit =
      command.limit && command.limit > 0 ? (command.limit > 50 ? 50 : command.limit) : 10;

    const result = await this.favoriteRepository.listFavorites(
      { userId: command.userId },
      command.cursor,
      realLimit,
    );

    const siteIds = result.data.map((item) => item.siteId);
    const sites = await this.siteRepository.findByIds(siteIds);

    const siteMap = new Map<string, Site>();
    for (const site of sites) {
      siteMap.set(site.id, site);
    }

    const data: FavoriteSiteItem[] = result.data
      .map((item) => {
        const site = siteMap.get(item.siteId);
        if (!site) {
          return null;
        }
        return {
          id: item.id,
          site,
          createdAt: item.createdAt,
        };
      })
      .filter((x): x is FavoriteSiteItem => x !== null);

    return {
      data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }
}
