import { ScamReportComment } from '../../../domain/entities/scam-report-comment.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IScamReportCommentRepository {
  findById(id: string, relations?: string[]): Promise<ScamReportComment | null>;
  findByReportId(
    reportId: string,
    parentCommentId?: string | null,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<ScamReportComment>>;
  create(comment: Partial<ScamReportComment>): Promise<ScamReportComment>;
  update(id: string, data: Partial<ScamReportComment>): Promise<ScamReportComment>;
  delete(id: string): Promise<void>;
}
