import { Injectable, Inject } from '@nestjs/common';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Inquiry, InquiryStatus, InquiryCategory } from '../../../domain/entities/inquiry.entity';
import {
  IInquiryRepository,
  InquiryFilters,
} from '../../../infrastructure/persistence/repositories/inquiry.repository';

export interface ListUserInquiriesCommand {
  userId: string;
  status?: InquiryStatus;
  category?: InquiryCategory;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ListUserInquiriesUseCase {
  constructor(
    @Inject('IInquiryRepository')
    private readonly inquiryRepository: IInquiryRepository,
  ) {}

  async execute(
    command: ListUserInquiriesCommand,
  ): Promise<CursorPaginationResult<Inquiry>> {
    const filters: InquiryFilters = {
      status: command.status,
      category: command.category,
    };

    return this.inquiryRepository.findAllWithCursor(
      filters,
      command.cursor,
      command.limit,
      command.sortBy,
      command.sortOrder,
    );
  }
}
