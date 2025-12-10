export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  accessToken: string;
  refreshToken: string;
}
