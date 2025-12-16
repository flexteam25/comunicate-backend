import { Injectable, Inject } from '@nestjs/common';
import { IInquiryRepository, InquiryFilters } from '../../../infrastructure/persistence/repositories/inquiry.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Inquiry } from '../../../domain/entities/inquiry.entity';

export interface ListInquiriesCommand {
  filters?: InquiryFilters;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ListInquiriesUseCase {
  constructor(
    @Inject('IInquiryRepository')
    private readonly inquiryRepository: IInquiryRepository,
  ) {}

  async execute(command: ListInquiriesCommand): Promise<CursorPaginationResult<Inquiry>> {
    return this.inquiryRepository.findAllWithCursor(
      command.filters,
      command.cursor,
      command.limit,
      command.sortBy,
      command.sortOrder,
    );
  }
}

