import { Injectable, Inject } from '@nestjs/common';
import { IPostCommentRepository } from '../../../infrastructure/persistence/repositories/post-comment.repository';
import { IPostCommentReactionRepository } from '../../../infrastructure/persistence/repositories/post-comment-reaction.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { PostCommentReaction } from '../../../domain/entities/post-comment-reaction.entity';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteCommentReactionCommand {
  commentId: string;
  userId: string;
}

@Injectable()
export class DeleteCommentReactionUseCase {
  constructor(
    @Inject('IPostCommentRepository')
    private readonly commentRepository: IPostCommentRepository,
    @Inject('IPostCommentReactionRepository')
    private readonly reactionRepository: IPostCommentReactionRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: DeleteCommentReactionCommand): Promise<void> {
    const comment = await this.commentRepository.findById(command.commentId);
    if (!comment || comment.deletedAt) {
      throw notFound(MessageKeys.COMMENT_NOT_FOUND);
    }

    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const existing = await this.reactionRepository.findByCommentIdAndUserId(
        command.commentId,
        command.userId,
      );

      if (!existing) {
        throw notFound(MessageKeys.REACTION_NOT_FOUND);
      }

      await manager.getRepository(PostCommentReaction).delete(existing.id);
    });
  }
}
