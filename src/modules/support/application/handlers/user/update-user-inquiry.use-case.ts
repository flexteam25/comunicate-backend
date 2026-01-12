import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  Inquiry,
  InquiryStatus,
  InquiryCategory,
} from '../../../domain/entities/inquiry.entity';
import { IInquiryRepository } from '../../../infrastructure/persistence/repositories/inquiry.repository';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdateUserInquiryCommand {
  inquiryId: string;
  userId: string;
  title?: string;
  category?: InquiryCategory;
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
      throw notFound(MessageKeys.INQUIRY_NOT_FOUND);
    }

    if (inquiry.status !== InquiryStatus.PENDING) {
      throw badRequest(MessageKeys.ONLY_PENDING_INQUIRIES_CAN_BE_UPDATED);
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const inquiryRepo = manager.getRepository(Inquiry);

        if (typeof command.title === 'string') {
          inquiry.title = command.title;
        }

        if (typeof command.category !== 'undefined') {
          inquiry.category = command.category;
        }

        if (typeof command.message === 'string') {
          inquiry.message = command.message;
        }

        if (typeof command.images !== 'undefined') {
          inquiry.images = command.images;
        }

        return inquiryRepo.save(inquiry);
      },
    );
  }
}
