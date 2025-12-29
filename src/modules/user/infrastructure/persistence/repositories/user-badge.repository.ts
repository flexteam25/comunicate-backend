import { UserBadge } from '../../../domain/entities/user-badge.entity';

export interface IUserBadgeRepository {
  findByUserId(userId: string): Promise<UserBadge[]>;
  assignBadge(userId: string, badgeId: string, active?: boolean): Promise<UserBadge>;
  removeBadge(userId: string, badgeId: string): Promise<void>;
  hasBadge(userId: string, badgeId: string): Promise<boolean>;
  findByUserAndBadge(userId: string, badgeId: string): Promise<UserBadge | null>;
  updateActiveStatus(userId: string, badgeIds: string[], active: boolean): Promise<void>;
  findByUserIdsWithActive(userId: string, badgeIds: string[]): Promise<UserBadge[]>;
}
