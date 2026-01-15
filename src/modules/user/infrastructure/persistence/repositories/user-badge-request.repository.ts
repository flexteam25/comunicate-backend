import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface UserBadgeRequestFilters {
  userId?: string;
  badgeId?: string;
  status?: UserBadgeRequestStatus;
  userName?: string;
  badgeName?: string;
}

export interface IUserBadgeRequestRepository {
  create(request: Partial<UserBadgeRequest>): Promise<UserBadgeRequest>;
  findById(id: string, relations?: string[]): Promise<UserBadgeRequest | null>;
  findAllWithCursor(
    filters: UserBadgeRequestFilters,
    cursor?: string,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<CursorPaginationResult<UserBadgeRequest>>;
  findPendingByUserAndBadge(userId: string, badgeId: string): Promise<UserBadgeRequest | null>;
  update(id: string, data: Partial<UserBadgeRequest>): Promise<UserBadgeRequest>;
}
