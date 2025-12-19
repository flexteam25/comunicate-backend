import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IFeedbackRepository } from '../../../infrastructure/persistence/repositories/feedback.repository';
import { Feedback } from '../../../domain/entities/feedback.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface MarkFeedbackViewedCommand {
  feedbackId: string;
  adminId: string;
}

@Injectable()
export class MarkFeedbackViewedUseCase {
  constructor(
    @Inject('IFeedbackRepository')
    private readonly feedbackRepository: IFeedbackRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: MarkFeedbackViewedCommand): Promise<Feedback> {
    // Check if feedback exists
    const feedback = await this.feedbackRepository.findById(command.feedbackId);
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const feedbackRepo = manager.getRepository(Feedback);

        feedback.isViewed = true;
        feedback.viewedByAdminId = command.adminId;
        feedback.viewedAt = new Date();

        return feedbackRepo.save(feedback);
      },
    );
  }
}
