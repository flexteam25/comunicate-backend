export interface BadgeResponse {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  earnedAt: Date;
}
