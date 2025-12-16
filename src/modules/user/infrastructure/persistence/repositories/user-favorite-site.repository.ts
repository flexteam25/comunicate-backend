export interface UserFavoriteSiteFilters {
  userId: string;
}

export interface IUserFavoriteSiteRepository {
  addFavorite(userId: string, siteId: string): Promise<void>;
  removeFavorite(userId: string, siteId: string): Promise<void>;
  isFavorite(userId: string, siteId: string): Promise<boolean>;
  listFavorites(
    filters: UserFavoriteSiteFilters,
    cursor?: string,
    limit?: number,
  ): Promise<{
    data: {
      id: string;
      siteId: string;
      createdAt: Date;
    }[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
}


