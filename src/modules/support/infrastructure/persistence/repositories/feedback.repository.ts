import { Feedback } from '../../../domain/entities/feedback.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface FeedbackFilters {
  userId?: string;
  isViewed?: boolean;
}

export interface IFeedbackRepository {
  findById(id: string, relations?: string[]): Promise<Feedback | null>;
  findAllWithCursor(
    filters?: FeedbackFilters,
    cursor?: string,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<CursorPaginationResult<Feedback>>;
  create(feedback: Partial<Feedback>): Promise<Feedback>;
  update(id: string, data: Partial<Feedback>): Promise<Feedback>;
  findByUserId(userId: string): Promise<Feedback[]>;
}
