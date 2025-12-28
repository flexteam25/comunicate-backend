import { SiteReview } from '../../../domain/entities/site-review.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ISiteReviewRepository {
  findById(id: string, relations?: string[]): Promise<SiteReview | null>;
  findBySiteIdAndUserId(siteId: string, userId: string): Promise<SiteReview | null>;
  findBySiteId(
    siteId: string,
    filters?: {
      isPublished?: boolean;
      rating?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteReview>>;
  findAll(
    filters?: {
      siteId?: string;
      userId?: string;
      isPublished?: boolean;
      rating?: number;
      search?: string;
      searchByReviewerName?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteReview>>;
  findByUserId(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteReview>>;
  create(review: Partial<SiteReview>): Promise<SiteReview>;
  update(id: string, data: Partial<SiteReview>): Promise<SiteReview>;
  delete(id: string): Promise<void>;
  getStatistics(siteId: string): Promise<{
    averageRating: number;
    averageOdds: number;
    averageLimit: number;
    averageEvent: number;
    averageSpeed: number;
    reviewCount: number;
  }>;
}
