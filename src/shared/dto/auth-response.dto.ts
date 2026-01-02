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
  };
  accessToken: string;
  refreshToken: string;
}
