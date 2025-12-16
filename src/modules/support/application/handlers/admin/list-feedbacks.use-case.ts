import { Injectable, Inject } from '@nestjs/common';
import { IFeedbackRepository, FeedbackFilters } from '../../../infrastructure/persistence/repositories/feedback.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Feedback } from '../../../domain/entities/feedback.entity';

export interface ListFeedbacksCommand {
  filters?: FeedbackFilters;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ListFeedbacksUseCase {
  constructor(
    @Inject('IFeedbackRepository')
    private readonly feedbackRepository: IFeedbackRepository,
  ) {}

  async execute(command: ListFeedbacksCommand): Promise<CursorPaginationResult<Feedback>> {
    return this.feedbackRepository.findAllWithCursor(
      command.filters,
      command.cursor,
      command.limit,
      command.sortBy,
      command.sortOrder,
    );
  }
}

