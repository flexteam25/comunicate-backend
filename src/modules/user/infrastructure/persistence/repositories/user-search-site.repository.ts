export interface IUserSearchSiteRepository {
  addSearchHistory(userId: string, searchQuery: string): Promise<void>;
  findRecentSearchHistory(
    userId: string,
    limit: number,
  ): Promise<{ searchQuery: string; createdAt: Date }[]>;
  findRecentSearchHistoryWithIds(
    userId: string,
    limit: number,
  ): Promise<Array<{ id: string; searchQuery: string; createdAt: Date }>>;
  deleteByIds(userId: string, ids: string[]): Promise<void>;
  deleteAll(userId: string): Promise<void>;
}
