import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PostReaction, ReactionType } from '../../../domain/entities/post-reaction.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostReactionRepository } from '../../../infrastructure/persistence/repositories/post-reaction.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { Post } from '../../../domain/entities/post.entity';

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

  async execute(command: ReactToPostCommand): Promise<PostReaction | null> {
    const post = await this.postRepository.findById(command.postId);
    if (!post || !post.isPublished) {
      throw new NotFoundException('Post not found');
    }

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const reactionRepo = manager.getRepository(PostReaction);
        const postRepo = manager.getRepository(Post);

        const existing = await this.reactionRepository.findByPostIdAndUserId(
          command.postId,
          command.userId,
        );

        if (existing) {
          if (existing.reactionType === command.reactionType) {
            // Remove reaction (toggle off)
            await reactionRepo.delete(existing.id);
            // Like/dislike counts are computed dynamically from reactions
            return null;
          } else {
            // Toggle reaction type
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
          // Like/dislike counts are computed dynamically from reactions
          return saved;
        }
      },
    );
  }
}
