import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IInquiryRepository } from '../../../infrastructure/persistence/repositories/inquiry.repository';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface ReplyInquiryCommand {
  inquiryId: string;
  adminId: string;
  reply: string;
  status?: InquiryStatus;
}

@Injectable()
export class ReplyInquiryUseCase {
  constructor(
    @Inject('IInquiryRepository')
    private readonly inquiryRepository: IInquiryRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ReplyInquiryCommand): Promise<Inquiry> {
    // Check if inquiry exists
    const inquiry = await this.inquiryRepository.findById(command.inquiryId);
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const inquiryRepo = manager.getRepository(Inquiry);

        inquiry.adminId = command.adminId;
        inquiry.adminReply = command.reply;
        inquiry.repliedAt = new Date();
        if (command.status) {
          inquiry.status = command.status;
        } else if (inquiry.status === InquiryStatus.PENDING) {
          inquiry.status = InquiryStatus.PROCESSING;
        }

        return inquiryRepo.save(inquiry);
      },
    );
  }
}
