import { SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { SiteResponse } from './site-response.dto';
import { BadgeResponse } from './site-response.dto';

export class BadgeRequestUserResponse {
  id: string;
  email: string;
  displayName?: string;
}

export class BadgeRequestAdminResponse {
  id: string;
  email: string;
  displayName?: string;
}

export class BadgeRequestResponse {
  id: string;
  siteId: string;
  badgeId: string;
  userId: string;
  adminId?: string;
  status: SiteBadgeRequestStatus;
  note?: string;
  site: SiteResponse;
  badge: BadgeResponse;
  user: BadgeRequestUserResponse;
  admin?: BadgeRequestAdminResponse;
  createdAt: Date;
  updatedAt: Date;
}
