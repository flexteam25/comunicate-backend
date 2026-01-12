export interface IUserSearchSiteRepository {
  addSearchHistory(userId: string, searchQuery: string): Promise<void>;
  findRecentSearchHistory(
    userId: string,
    limit: number,
  ): Promise<{ searchQuery: string; createdAt: Date }[]>;
}
