import { Injectable, Inject } from '@nestjs/common';
import { IBugReportRepository, BugReportFilters } from '../../../infrastructure/persistence/repositories/bug-report.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { BugReport } from '../../../domain/entities/bug-report.entity';

export interface ListBugReportsCommand {
  filters?: BugReportFilters;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ListBugReportsUseCase {
  constructor(
    @Inject('IBugReportRepository')
    private readonly bugReportRepository: IBugReportRepository,
  ) {}

  async execute(command: ListBugReportsCommand): Promise<CursorPaginationResult<BugReport>> {
    return this.bugReportRepository.findAllWithCursor(
      command.filters,
      command.cursor,
      command.limit,
      command.sortBy,
      command.sortOrder,
    );
  }
}

