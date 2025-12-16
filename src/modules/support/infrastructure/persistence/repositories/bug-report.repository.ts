import { BugReport } from '../../../domain/entities/bug-report.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface BugReportFilters {
  userId?: string;
  isViewed?: boolean;
}

export interface IBugReportRepository {
  findById(id: string, relations?: string[]): Promise<BugReport | null>;
  findAllWithCursor(
    filters?: BugReportFilters,
    cursor?: string,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<CursorPaginationResult<BugReport>>;
  create(bugReport: Partial<BugReport>): Promise<BugReport>;
  update(id: string, data: Partial<BugReport>): Promise<BugReport>;
  findByUserId(userId: string): Promise<BugReport[]>;
}

