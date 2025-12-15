import { SiteBadge } from '../../../domain/entities/site-badge.entity';

export interface ISiteBadgeRepository {
  findBySiteId(siteId: string): Promise<SiteBadge[]>;
  assignBadge(siteId: string, badgeId: string): Promise<SiteBadge>;
  removeBadge(siteId: string, badgeId: string): Promise<void>;
  hasBadge(siteId: string, badgeId: string): Promise<boolean>;
}

