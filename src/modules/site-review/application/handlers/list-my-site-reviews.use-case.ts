import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';
import { SiteReview } from '../../domain/entities/site-review.entity';

export interface ListMySiteReviewsCommand {
  userId: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListMySiteReviewsUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(
    command: ListMySiteReviewsCommand,
  ): Promise<CursorPaginationResult<SiteReview>> {
    return this.siteReviewRepository.findByUserId(
      command.userId,
      command.cursor,
      command.limit,
    );
  }
}
