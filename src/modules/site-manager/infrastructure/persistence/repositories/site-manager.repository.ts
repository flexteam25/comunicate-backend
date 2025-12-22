import { SiteManager } from '../../../domain/entities/site-manager.entity';

export interface ISiteManagerRepository {
  findById(id: string, relations?: string[]): Promise<SiteManager | null>;
  findBySiteAndUser(
    siteId: string,
    userId: string,
  ): Promise<SiteManager | null>;
  findBySiteId(siteId: string): Promise<SiteManager[]>;
  findByUserId(userId: string): Promise<SiteManager[]>;
  create(manager: Partial<SiteManager>): Promise<SiteManager>;
  update(id: string, data: Partial<SiteManager>): Promise<SiteManager>;
  delete(id: string): Promise<void>;
}

