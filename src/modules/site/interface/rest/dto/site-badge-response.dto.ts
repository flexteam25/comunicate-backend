export interface SiteBadgeResponse {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  iconName?: string | null;
  badgeType: string;
  isActive: boolean;
  obtain?: string | null;
  point: number;
  color?: string | null;
  order?: number | null;
  active: boolean; // true if badge is assigned to the site, false otherwise
  createdAt: Date;
  updatedAt: Date;
}
