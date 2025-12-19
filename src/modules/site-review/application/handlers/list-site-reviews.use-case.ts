import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';
import { SiteReview } from '../../domain/entities/site-review.entity';

export interface ListSiteReviewsCommand {
  siteId: string;
  isPublished?: boolean;
  rating?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListSiteReviewsUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(
    command: ListSiteReviewsCommand,
  ): Promise<CursorPaginationResult<SiteReview>> {
    return this.siteReviewRepository.findBySiteId(
      command.siteId,
      {
        isPublished: command.isPublished !== undefined ? command.isPublished : true,
        rating: command.rating,
        search: command.search,
        sortBy: command.sortBy || 'createdAt',
        sortOrder: command.sortOrder || 'DESC',
      },
      command.cursor,
      command.limit,
    );
  }
}
