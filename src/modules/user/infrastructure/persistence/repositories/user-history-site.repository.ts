export interface IUserHistorySiteRepository {
  addHistory(userId: string, siteId: string): Promise<void>;
  findRecentHistory(
    userId: string,
    limit: number,
  ): Promise<{ siteId: string; createdAt: Date }[]>;
  findRecentHistoryWithIds(
    userId: string,
    limit: number,
  ): Promise<Array<{ id: string; siteId: string; createdAt: Date }>>;
  deleteByIds(userId: string, ids: string[]): Promise<void>;
  deleteAll(userId: string): Promise<void>;
}
