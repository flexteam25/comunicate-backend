import { Injectable, Inject } from '@nestjs/common';
import { ISiteReviewCommentRepository } from '../../infrastructure/persistence/repositories/site-review-comment.repository';
import {
  CommentHasChildService,
  CommentType,
} from '../../../../shared/services/comment-has-child.service';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import {
  UserComment,
  CommentType as UserCommentType,
} from '../../../user/domain/entities/user-comment.entity';

export interface DeleteCommentCommand {
  commentId: string;
  userId: string;
}

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject('ISiteReviewCommentRepository')
    private readonly commentRepository: ISiteReviewCommentRepository,
    private readonly commentHasChildService: CommentHasChildService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentRepository.findById(command.commentId);

    if (!comment) {
      throw notFound(MessageKeys.COMMENT_NOT_FOUND);
    }

    if (comment.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_DELETE_OWN_COMMENTS);
    }

    // Store parentCommentId before deletion for async update
    const parentCommentId = comment.parentCommentId;

    // Soft delete comment and corresponding UserComment in transaction
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      await this.commentRepository.delete(command.commentId);

      // Soft delete corresponding UserComment record
      const userCommentRepo = manager.getRepository(UserComment);
      await userCommentRepo
        .createQueryBuilder()
        .softDelete()
        .where('commentId = :commentId', { commentId: command.commentId })
        .andWhere('commentType = :commentType', {
          commentType: UserCommentType.SITE_REVIEW_COMMENT,
        })
        .execute();
    });

    // Update has_child for parent comment asynchronously
    if (parentCommentId) {
      void this.commentHasChildService.updateHasChildAsync(
        CommentType.SITE_REVIEW,
        parentCommentId,
      );
    }
  }
}
