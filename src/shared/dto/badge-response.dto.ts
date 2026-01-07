export interface BadgeResponse {
  name: string;
  iconUrl?: string;
  earnedAt?: Date;
  active?: boolean;
  obtain?: string;
  description?: string;
  point?: number | null;
}
