import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteReviewCommentRepository } from '../../infrastructure/persistence/repositories/site-review-comment.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';
import { SiteReviewComment } from '../../domain/entities/site-review-comment.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface ListCommentsCommand {
  reviewId: string;
  parentCommentId?: string | null;
  cursor?: string;
  limit?: number;
  userId?: string;
}

@Injectable()
export class ListCommentsUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteReviewCommentRepository')
    private readonly commentRepository: ISiteReviewCommentRepository,
  ) {}

  async execute(
    command: ListCommentsCommand,
  ): Promise<CursorPaginationResult<SiteReviewComment>> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND);
    }

    // Public can view comments on published reviews
    // Owners can view comments on their own reviews
    if (!review.isPublished && review.userId !== command.userId) {
      throw badRequest(MessageKeys.CAN_ONLY_VIEW_COMMENTS_ON_PUBLISHED_REVIEWS);
    }

    // Validate parent comment if provided (not undefined and not null)
    if (command.parentCommentId !== undefined && command.parentCommentId !== null) {
      const parentComment = await this.commentRepository.findById(
        command.parentCommentId,
      );
      if (
        !parentComment ||
        parentComment.siteReviewId !== command.reviewId ||
        parentComment.deletedAt
      ) {
        throw badRequest(MessageKeys.PARENT_COMMENT_NOT_FOUND_OR_INVALID);
      }
    }

    return this.commentRepository.findByReviewId(
      command.reviewId,
      command.parentCommentId,
      command.cursor,
      command.limit,
    );
  }
}
