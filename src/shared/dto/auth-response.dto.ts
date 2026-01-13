export interface UserBadgeSummary {
  name: string;
  iconUrl?: string;
  iconName?: string;
  color?: string;
  earnedAt?: Date;
  description?: string;
  obtain?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    roles: string;
    bio?: string;
    phone?: string;
    birthDate?: Date;
    gender?: string;
    points?: number;
    badge?: UserBadgeSummary | null;
  };
  accessToken: string;
  refreshToken: string;
}
