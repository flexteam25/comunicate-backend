import { SiteReviewComment } from '../../../domain/entities/site-review-comment.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ISiteReviewCommentRepository {
  findById(id: string, relations?: string[]): Promise<SiteReviewComment | null>;
  findByReviewId(
    reviewId: string,
    parentCommentId?: string | null,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<SiteReviewComment>>;
  create(comment: Partial<SiteReviewComment>): Promise<SiteReviewComment>;
  update(id: string, data: Partial<SiteReviewComment>): Promise<SiteReviewComment>;
  delete(id: string): Promise<void>;
}
