import { SiteEvent } from '../../../domain/entities/site-event.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ISiteEventRepository {
  findById(id: string, relations?: string[]): Promise<SiteEvent | null>;
  findBySiteId(
    siteId: string,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteEvent>>;
  findAll(
    filters?: {
      siteId?: string; // For exact match by UUID
      siteName?: string; // For LIKE search by site name
      userName?: string; // For LIKE search by user display name
      adminName?: string; // For LIKE search by admin display name
      isActive?: boolean;
      search?: string; // Search in title
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteEvent>>;
  create(event: Partial<SiteEvent>): Promise<SiteEvent>;
  update(id: string, data: Partial<SiteEvent>): Promise<SiteEvent>;
  delete(id: string): Promise<void>;
}
