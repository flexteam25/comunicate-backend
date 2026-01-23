import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface SiteRequestFilters {
  status?: SiteRequestStatus;
  userId?: string;
  userName?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ISiteRequestRepository {
  findById(id: string, relations?: string[]): Promise<SiteRequest | null>;
  findByUserId(userId: string, relations?: string[]): Promise<SiteRequest[]>;
  findAll(
    filters?: SiteRequestFilters,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteRequest>>;
  findPendingByName(name: string): Promise<SiteRequest | null>;
  findDuplicateName(name: string, excludeId?: string): Promise<SiteRequest | null>;
  create(siteRequest: Partial<SiteRequest>): Promise<SiteRequest>;
  update(id: string, data: Partial<SiteRequest>): Promise<SiteRequest>;
  delete(id: string): Promise<void>;
}
