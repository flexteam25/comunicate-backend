import {
  ScamReport,
  ScamReportStatus,
} from '../../../domain/entities/scam-report.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IScamReportRepository {
  findById(id: string, relations?: string[]): Promise<ScamReport | null>;
  findBySiteId(
    siteId: string,
    status?: ScamReportStatus,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<ScamReport>>;
  findByUserId(
    userId: string,
    status?: ScamReportStatus,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<ScamReport>>;
  findAll(
    status?: ScamReportStatus,
    siteName?: string,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<ScamReport>>;
  countBySiteId(siteId: string, status?: ScamReportStatus): Promise<number>;
  create(report: Partial<ScamReport>): Promise<ScamReport>;
  update(id: string, data: Partial<ScamReport>): Promise<ScamReport>;
  delete(id: string): Promise<void>;
}
