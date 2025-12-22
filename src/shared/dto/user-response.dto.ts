import { RoleResponse } from './role-response.dto';
import { BadgeResponse } from './badge-response.dto';

export interface UserResponse {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  roles?: RoleResponse[];
  badges?: BadgeResponse[];
  createdAt: Date;
  updatedAt: Date;
  bio?: string;
  phone?: string;
  birthDate?: Date;
  gender?: string;
  points?: number;
}
