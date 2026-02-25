export interface IUserSearchSiteRepository {
  addSearchHistory(userId: string, searchQuery: string): Promise<void>;
  findRecentSearchHistory(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    data: { searchQuery: string; createdAt: Date }[];
    nextCursor: string | null;
    prevCursor: string | null;
  }>;
  findRecentSearchHistoryWithIds(
    userId: string,
    limit: number,
  ): Promise<Array<{ id: string; searchQuery: string; createdAt: Date }>>;
  deleteByIds(userId: string, ids: string[]): Promise<void>;
  deleteAll(userId: string): Promise<void>;
}
