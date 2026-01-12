import { Injectable, Inject } from '@nestjs/common';
import {
  PostReaction,
  ReactionType,
} from '../../../domain/entities/post-reaction.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostReactionRepository } from '../../../infrastructure/persistence/repositories/post-reaction.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface ReactToPostCommand {
  postId: string;
  userId: string;
  reactionType: ReactionType;
}

@Injectable()
export class ReactToPostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
    @Inject('IPostReactionRepository')
    private readonly reactionRepository: IPostReactionRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ReactToPostCommand): Promise<PostReaction> {
    const post = await this.postRepository.findById(command.postId);
    if (!post || !post.isPublished) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reactionRepo = manager.getRepository(PostReaction);

        const existing = await this.reactionRepository.findByPostIdAndUserId(
          command.postId,
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
            postId: command.postId,
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
