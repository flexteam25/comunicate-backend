import { Injectable, Inject } from '@nestjs/common';
import { IInquiryRepository } from '../../../infrastructure/persistence/repositories/inquiry.repository';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface CreateInquiryCommand {
  userId: string;
  message: string;
  images?: string[];
}

@Injectable()
export class CreateInquiryUseCase {
  constructor(
    @Inject('IInquiryRepository')
    private readonly inquiryRepository: IInquiryRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateInquiryCommand): Promise<Inquiry> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const inquiryRepo = manager.getRepository(Inquiry);

        const inquiry = inquiryRepo.create({
          userId: command.userId,
          message: command.message,
          images: command.images || [],
          status: InquiryStatus.PENDING,
        });

        return inquiryRepo.save(inquiry);
      },
    );
  }
}
