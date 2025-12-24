import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ISiteManagerApplicationRepository {
  findById(id: string, relations?: string[]): Promise<SiteManagerApplication | null>;
  findBySiteAndUser(
    siteId: string,
    userId: string,
    status?: SiteManagerApplicationStatus,
  ): Promise<SiteManagerApplication | null>;
  findBySiteId(
    siteId: string,
    status?: SiteManagerApplicationStatus,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteManagerApplication>>;
  findByUserId(
    userId: string,
    status?: SiteManagerApplicationStatus,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteManagerApplication>>;
  findAll(
    filters?: {
      siteName?: string;
      userId?: string;
      status?: SiteManagerApplicationStatus;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteManagerApplication>>;
  create(application: Partial<SiteManagerApplication>): Promise<SiteManagerApplication>;
  update(
    id: string,
    data: Partial<SiteManagerApplication>,
  ): Promise<SiteManagerApplication>;
}
