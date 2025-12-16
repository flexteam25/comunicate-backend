import { UserBadge } from '../../../domain/entities/user-badge.entity';

export interface IUserBadgeRepository {
  findByUserId(userId: string): Promise<UserBadge[]>;
  assignBadge(userId: string, badgeId: string): Promise<UserBadge>;
  removeBadge(userId: string, badgeId: string): Promise<void>;
  hasBadge(userId: string, badgeId: string): Promise<boolean>;
  findByUserAndBadge(userId: string, badgeId: string): Promise<UserBadge | null>;
}
