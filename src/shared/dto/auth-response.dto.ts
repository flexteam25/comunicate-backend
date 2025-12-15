export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    phone?: string;
    birthDate?: Date;
    gender?: string;
  };
  accessToken: string;
  refreshToken: string;
}
