import { UserBadge } from '../../../domain/entities/user-badge.entity';

export interface IUserBadgeRepository {
  assignBadge(userId: string, badgeId: string, active?: boolean): Promise<UserBadge>;
  removeBadge(userId: string, badgeId: string): Promise<void>;
  hasBadge(userId: string, badgeId: string): Promise<boolean>;
  findByUserAndBadge(userId: string, badgeId: string): Promise<UserBadge | null>;
  setActiveBadge(userId: string, badgeId: string): Promise<void>;
}
