import { SiteRequestStatus } from '../../../domain/entities/site-request.entity';
import { SiteResponse } from '../../../../site/interface/rest/dto/site-response.dto';

export class SiteRequestUserSummary {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export class SiteRequestCategorySummary {
  id: string;
  name: string;
  nameKo?: string;
  description?: string;
}

export class SiteRequestTierSummary {
  id: string;
  name: string;
  description?: string;
  order: number;
  color?: string;
}

export class SiteRequestAdminSummary {
  id: string;
  email: string;
  displayName?: string;
}

export class SiteRequestResponseDto {
  id: string;
  userId: string;
  user?: SiteRequestUserSummary;
  name: string;
  slug?: string;
  categoryId: string;
  category?: SiteRequestCategorySummary;
  logoUrl?: string;
  mainImageUrl?: string;
  siteImageUrl?: string;
  tierId?: string;
  tier?: SiteRequestTierSummary;
  permanentUrl?: string;
  accessibleUrl?: string;
  csMessenger: string;
  description?: string;
  firstCharge?: number;
  recharge?: number;
  experience: number;
  status: SiteRequestStatus;
  siteId?: string;
  site?: SiteResponse;
  adminId?: string;
  admin?: SiteRequestAdminSummary;
  rejectionReason?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}
