import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface SiteBadgeRequestFilters {
  siteId?: string;
  userId?: string;
  badgeId?: string;
  status?: SiteBadgeRequestStatus;
  siteName?: string;
  badgeName?: string;
}

export interface ISiteBadgeRequestRepository {
  create(request: Partial<SiteBadgeRequest>): Promise<SiteBadgeRequest>;
  findById(id: string, relations?: string[]): Promise<SiteBadgeRequest | null>;
  findAllWithCursor(
    filters: SiteBadgeRequestFilters,
    cursor?: string,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<CursorPaginationResult<SiteBadgeRequest>>;
  findPendingBySiteAndBadge(siteId: string, badgeId: string): Promise<SiteBadgeRequest | null>;
  update(id: string, data: Partial<SiteBadgeRequest>): Promise<SiteBadgeRequest>;
}
