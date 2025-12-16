export interface IUserHistorySiteRepository {
  addHistory(userId: string, siteId: string): Promise<void>;
  findRecentHistory(
    userId: string,
    limit: number,
  ): Promise<{ siteId: string; createdAt: Date }[]>;
}
