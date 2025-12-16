import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { IInquiryRepository } from '../../../infrastructure/persistence/repositories/inquiry.repository';

export interface UpdateUserInquiryCommand {
  inquiryId: string;
  userId: string;
  message?: string;
  images?: string[];
}

@Injectable()
export class UpdateUserInquiryUseCase {
  constructor(
    @Inject('IInquiryRepository')
    private readonly inquiryRepository: IInquiryRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateUserInquiryCommand): Promise<Inquiry> {
    const inquiry = await this.inquiryRepository.findById(command.inquiryId);

    if (!inquiry || inquiry.userId !== command.userId) {
      throw new NotFoundException('Inquiry not found');
    }

    if (inquiry.status !== InquiryStatus.PENDING) {
      throw new BadRequestException('Only pending inquiries can be updated');
    }

    return this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const inquiryRepo = manager.getRepository(Inquiry);

      if (typeof command.message === 'string') {
        inquiry.message = command.message;
      }

      if (typeof command.images !== 'undefined') {
        inquiry.images = command.images;
      }

      return inquiryRepo.save(inquiry);
    });
  }
}
