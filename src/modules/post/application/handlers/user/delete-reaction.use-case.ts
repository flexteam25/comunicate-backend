import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IPostReactionRepository } from '../../../infrastructure/persistence/repositories/post-reaction.repository';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { ReactionType } from '../../../domain/entities/post-reaction.entity';

export interface DeleteReactionCommand {
  postId: string;
  userId: string;
}

@Injectable()
export class DeleteReactionUseCase {
  constructor(
    @Inject('IPostReactionRepository')
    private readonly reactionRepository: IPostReactionRepository,
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(command: DeleteReactionCommand): Promise<void> {
    const post = await this.postRepository.findById(command.postId);
    if (!post || !post.isPublished) {
      throw new NotFoundException('Post not found');
    }

    const reaction = await this.reactionRepository.findByPostIdAndUserId(
      command.postId,
      command.userId,
    );

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    if (reaction.userId !== command.userId) {
      throw new ForbiddenException('You do not have permission to delete this reaction');
    }

    // Hard delete reaction; like/dislike counts are computed dynamically from reactions
    await this.reactionRepository.delete(reaction.id);
  }
}
