import { Injectable, Inject } from '@nestjs/common';
import { IBugReportRepository } from '../../../infrastructure/persistence/repositories/bug-report.repository';
import { BugReport } from '../../../domain/entities/bug-report.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface CreateBugReportCommand {
  userId: string;
  message: string;
  images?: string[];
}

@Injectable()
export class CreateBugReportUseCase {
  constructor(
    @Inject('IBugReportRepository')
    private readonly bugReportRepository: IBugReportRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateBugReportCommand): Promise<BugReport> {
    return this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const bugReportRepo = manager.getRepository(BugReport);

      const bugReport = bugReportRepo.create({
        userId: command.userId,
        message: command.message,
        images: command.images || [],
        isViewed: false,
      });

      return bugReportRepo.save(bugReport);
    });
  }
}

