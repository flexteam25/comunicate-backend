export interface IUserHistorySiteRepository {
  addHistory(userId: string, siteId: string): Promise<void>;
}
