import { SiteDomain } from '../../../domain/entities/site-domain.entity';

export interface ISiteDomainRepository {
  findById(id: string): Promise<SiteDomain | null>;
  findByDomain(domain: string): Promise<SiteDomain | null>;
  findBySiteId(siteId: string): Promise<SiteDomain[]>;
  findCurrentBySiteId(siteId: string): Promise<SiteDomain | null>;
  create(data: Partial<SiteDomain>): Promise<SiteDomain>;
  update(id: string, data: Partial<SiteDomain>): Promise<SiteDomain>;
  delete(id: string): Promise<void>;
  unsetCurrentForSite(siteId: string, exceptId?: string): Promise<void>;
}
