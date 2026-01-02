import { BadgeResponse } from './badge-response.dto';

export interface UserResponse {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  roles: string;
  badges: BadgeResponse[];
  createdAt: Date;
  updatedAt: Date;
  bio?: string;
  phone?: string;
  birthDate?: Date;
  gender?: string;
  points?: number;
}
