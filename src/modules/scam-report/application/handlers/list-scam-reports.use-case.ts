import { Injectable, Inject } from '@nestjs/common';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';

export interface ListScamReportsCommand {
  siteId?: string;
  siteName?: string;
  status?: ScamReportStatus;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListScamReportsUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
  ) {}

  async execute(command: ListScamReportsCommand): Promise<CursorPaginationResult<ScamReport>> {
    if (command.siteId) {
      return this.scamReportRepository.findBySiteId(
        command.siteId,
        command.status,
        command.cursor,
        command.limit,
      );
    }

    return this.scamReportRepository.findAll(
      command.status,
      command.siteName,
      command.cursor,
      command.limit,
    );
  }
}
