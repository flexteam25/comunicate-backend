import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteReviewCommentRepository } from '../../infrastructure/persistence/repositories/site-review-comment.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';
import { SiteReviewComment } from '../../domain/entities/site-review-comment.entity';

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
      throw new NotFoundException('Site review not found');
    }

    // Public can view comments on published reviews
    // Owners can view comments on their own reviews
    if (!review.isPublished && review.userId !== command.userId) {
      throw new BadRequestException(
        'You can only view comments on published site reviews',
      );
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
        throw new BadRequestException(
          'Parent comment not found, does not belong to this review, or has been deleted',
        );
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
