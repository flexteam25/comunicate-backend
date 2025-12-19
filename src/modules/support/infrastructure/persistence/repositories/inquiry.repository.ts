import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface InquiryFilters {
  userId?: string;
  status?: InquiryStatus;
  adminId?: string;
}

export interface IInquiryRepository {
  findById(id: string, relations?: string[]): Promise<Inquiry | null>;
  findAllWithCursor(
    filters?: InquiryFilters,
    cursor?: string,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<CursorPaginationResult<Inquiry>>;
  create(inquiry: Partial<Inquiry>): Promise<Inquiry>;
  update(id: string, data: Partial<Inquiry>): Promise<Inquiry>;
  findByUserId(userId: string): Promise<Inquiry[]>;
}
