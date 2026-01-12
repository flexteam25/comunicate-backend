import { Injectable, Inject } from '@nestjs/common';
import { PostCommentReaction } from '../../../domain/entities/post-comment-reaction.entity';
import { ReactionType } from '../../../domain/entities/post-reaction.entity';
import { IPostCommentRepository } from '../../../infrastructure/persistence/repositories/post-comment.repository';
import { IPostCommentReactionRepository } from '../../../infrastructure/persistence/repositories/post-comment-reaction.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface ReactToCommentCommand {
  commentId: string;
  userId: string;
  reactionType: ReactionType;
}

@Injectable()
export class ReactToCommentUseCase {
  constructor(
    @Inject('IPostCommentRepository')
    private readonly commentRepository: IPostCommentRepository,
    @Inject('IPostCommentReactionRepository')
    private readonly reactionRepository: IPostCommentReactionRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ReactToCommentCommand): Promise<PostCommentReaction> {
    const comment = await this.commentRepository.findById(command.commentId);
    if (!comment || comment.deletedAt) {
      throw notFound(MessageKeys.COMMENT_NOT_FOUND);
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reactionRepo = manager.getRepository(PostCommentReaction);

        const existing = await this.reactionRepository.findByCommentIdAndUserId(
          command.commentId,
          command.userId,
        );

        if (existing) {
          if (existing.reactionType === command.reactionType) {
            // Already have the same reaction type - return existing (no toggle)
            return existing;
          } else {
            // Update reaction type (like -> dislike or dislike -> like)
            existing.reactionType = command.reactionType;
            await reactionRepo.save(existing);
            return existing;
          }
        } else {
          // Create new reaction
          const reaction = reactionRepo.create({
            commentId: command.commentId,
            userId: command.userId,
            reactionType: command.reactionType,
          });
          const saved = await reactionRepo.save(reaction);
          return saved;
        }
      },
    );
  }
}
