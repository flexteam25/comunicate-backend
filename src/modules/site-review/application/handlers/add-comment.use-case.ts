import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteReviewComment } from '../../domain/entities/site-review-comment.entity';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteReviewCommentRepository } from '../../infrastructure/persistence/repositories/site-review-comment.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import {
  CommentHasChildService,
  CommentType as CommentHasChildType,
} from '../../../../shared/services/comment-has-child.service';
import {
  UserComment,
  CommentType,
} from '../../../user/domain/entities/user-comment.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface AddCommentCommand {
  reviewId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
}

@Injectable()
export class AddCommentUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteReviewCommentRepository')
    private readonly commentRepository: ISiteReviewCommentRepository,
    private readonly transactionService: TransactionService,
    private readonly commentHasChildService: CommentHasChildService,
  ) {}

  async execute(command: AddCommentCommand): Promise<SiteReviewComment> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND);
    }

    // Public users can only comment on published reviews
    // Owners can comment on any status
    if (!review.isPublished && review.userId !== command.userId) {
      throw badRequest(MessageKeys.CAN_ONLY_COMMENT_ON_PUBLISHED_REVIEWS);
    }

    // Validate parent comment if provided
    if (command.parentCommentId) {
      const parentComment = await this.commentRepository.findById(
        command.parentCommentId,
      );
      if (!parentComment || parentComment.siteReviewId !== command.reviewId) {
        throw badRequest(MessageKeys.PARENT_COMMENT_NOT_FOUND_OR_INVALID);
      }
    }

    const result = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const commentRepo = manager.getRepository(SiteReviewComment);
        const userCommentRepo = manager.getRepository(UserComment);

        const comment = commentRepo.create({
          siteReviewId: command.reviewId,
          userId: command.userId,
          parentCommentId: command.parentCommentId,
          content: command.content,
        });

        const savedComment = await commentRepo.save(comment);

        // Save to user_comments for statistics
        const userComment = userCommentRepo.create({
          userId: command.userId,
          commentType: CommentType.SITE_REVIEW_COMMENT,
          commentId: savedComment.id,
        });
        await userCommentRepo.save(userComment);

        return commentRepo.findOne({
          where: { id: savedComment.id },
          relations: ['user', 'user.userBadges', 'user.userBadges.badge'],
        });
      },
    );

    // Update has_child for parent comment asynchronously
    if (result?.parentCommentId) {
      void this.commentHasChildService.updateHasChildAsync(
        CommentHasChildType.SITE_REVIEW,
        result.parentCommentId,
      );
    }

    return result;
  }
}
