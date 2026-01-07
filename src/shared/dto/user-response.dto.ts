export interface UserBadgeSummary {
  name: string;
  iconUrl?: string;
  color?: string;
  earnedAt?: Date;
}

export interface UserResponse {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  roles: string;
  badge?: UserBadgeSummary | null;
  createdAt: Date;
  updatedAt: Date;
  bio?: string;
  phone?: string;
  birthDate?: Date;
  gender?: string;
  points?: number;
}
