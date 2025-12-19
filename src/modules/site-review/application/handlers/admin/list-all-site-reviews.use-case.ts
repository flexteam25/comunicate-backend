import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../../infrastructure/persistence/repositories/site-review.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { SiteReview } from '../../../domain/entities/site-review.entity';

export interface ListAllSiteReviewsCommand {
  siteId?: string;
  userId?: string;
  isPublished?: boolean;
  rating?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListAllSiteReviewsUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
  ) {}

  async execute(
    command: ListAllSiteReviewsCommand,
  ): Promise<CursorPaginationResult<SiteReview>> {
    return this.siteReviewRepository.findAll(
      {
        siteId: command.siteId,
        userId: command.userId,
        isPublished: command.isPublished,
        rating: command.rating,
        search: command.search,
        searchByReviewerName: command.search,
        sortBy: command.sortBy || 'createdAt',
        sortOrder: command.sortOrder || 'DESC',
      },
      command.cursor,
      command.limit,
    );
  }
}
