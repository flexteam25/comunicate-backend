import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScamReportStatus } from '../../domain/entities/scam-report.entity';
import {
  ReactionType,
  ScamReportReaction,
} from '../../domain/entities/scam-report-reaction.entity';
import { IScamReportRepository } from '../../infrastructure/persistence/repositories/scam-report.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';

export interface ReactToScamReportCommand {
  reportId: string;
  userId: string;
  reactionType: ReactionType;
}

@Injectable()
export class ReactToScamReportUseCase {
  constructor(
    @Inject('IScamReportRepository')
    private readonly scamReportRepository: IScamReportRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ReactToScamReportCommand): Promise<ScamReportReaction> {
    const report = await this.scamReportRepository.findById(command.reportId);

    if (!report) {
      throw new NotFoundException('Scam report not found');
    }

    if (report.status !== ScamReportStatus.PUBLISHED) {
      throw new BadRequestException('Scam report is not published');
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reactionRepo = manager.getRepository(ScamReportReaction);

        // Check if user already reacted
        const existingReaction = await reactionRepo.findOne({
          where: {
            scamReportId: command.reportId,
            userId: command.userId,
          },
        });

        if (existingReaction) {
          // Update existing reaction
          existingReaction.reactionType = command.reactionType;
          return reactionRepo.save(existingReaction);
        }

        // Create new reaction
        const reaction = reactionRepo.create({
          scamReportId: command.reportId,
          userId: command.userId,
          reactionType: command.reactionType,
        });

        return reactionRepo.save(reaction);
      },
    );
  }
}
