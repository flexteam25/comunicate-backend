import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IBugReportRepository } from '../../../infrastructure/persistence/repositories/bug-report.repository';
import { BugReport } from '../../../domain/entities/bug-report.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface MarkBugReportViewedCommand {
  bugReportId: string;
  adminId: string;
}

@Injectable()
export class MarkBugReportViewedUseCase {
  constructor(
    @Inject('IBugReportRepository')
    private readonly bugReportRepository: IBugReportRepository,
    private readonly transactionService: TransactionService
  ) {}

  async execute(command: MarkBugReportViewedCommand): Promise<BugReport> {
    // Check if bug report exists
    const bugReport = await this.bugReportRepository.findById(
      command.bugReportId
    );
    if (!bugReport) {
      throw new NotFoundException('Bug report not found');
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const bugReportRepo = manager.getRepository(BugReport);

        bugReport.isViewed = true;
        bugReport.viewedByAdminId = command.adminId;
        bugReport.viewedAt = new Date();

        return bugReportRepo.save(bugReport);
      },
    );
  }
}
