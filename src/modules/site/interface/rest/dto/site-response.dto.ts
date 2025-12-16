import { SiteStatus } from '../../../domain/entities/site.entity';
import { BadgeType } from 'src/modules/badge/domain/entities/badge.entity';

export class SiteCategoryResponse {
  id: string;
  name: string;
  description?: string;
}

export class TierResponse {
  id: string;
  name: string;
  description?: string;
  order: number;
  color?: string;
}

export class BadgeResponse {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export class AdminBadgeResponse {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  badgeType: BadgeType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
export class SiteDomainResponse {
  id: string;
  domain: string;
  isActive: boolean;
  isCurrent: boolean;
}

export class SiteResponse {
  id: string;
  name: string;
  category: SiteCategoryResponse;
  logoUrl?: string;
  mainImageUrl?: string;
  tier?: TierResponse;
  permanentUrl?: string;
  status: SiteStatus;
  description?: string;
  reviewCount: number;
  averageRating: number;
  badges: BadgeResponse[];
  domains: SiteDomainResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export class CursorPaginatedSitesResponse {
  data: SiteResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}
