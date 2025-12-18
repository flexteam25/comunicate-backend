import { Injectable, Inject } from '@nestjs/common';
import { ScamReport, ScamReportStatus } from '../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';

export interface ListMyScamReportsCommand {
  userId: string;
  status?: ScamReportStatus;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListMyScamReportsUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
  ) {}

  async execute(command: ListMyScamReportsCommand): Promise<CursorPaginationResult<ScamReport>> {
    return this.scamReportRepository.findByUserId(
      command.userId,
      command.status,
      command.cursor,
      command.limit,
    );
  }
}
