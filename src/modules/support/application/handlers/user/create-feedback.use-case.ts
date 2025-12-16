import { Injectable, Inject } from '@nestjs/common';
import { IFeedbackRepository } from '../../../infrastructure/persistence/repositories/feedback.repository';
import { Feedback } from '../../../domain/entities/feedback.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface CreateFeedbackCommand {
  userId: string;
  message: string;
  images?: string[];
}

@Injectable()
export class CreateFeedbackUseCase {
  constructor(
    @Inject('IFeedbackRepository')
    private readonly feedbackRepository: IFeedbackRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateFeedbackCommand): Promise<Feedback> {
    return this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const feedbackRepo = manager.getRepository(Feedback);

      const feedback = feedbackRepo.create({
        userId: command.userId,
        message: command.message,
        images: command.images || [],
        isViewed: false,
      });

      return feedbackRepo.save(feedback);
    });
  }
}

