import { Injectable, Inject } from '@nestjs/common';
import { IPostReactionRepository } from '../../../infrastructure/persistence/repositories/post-reaction.repository';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { ReactionType } from '../../../domain/entities/post-reaction.entity';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    const reaction = await this.reactionRepository.findByPostIdAndUserId(
      command.postId,
      command.userId,
    );

    if (!reaction) {
      throw notFound(MessageKeys.REACTION_NOT_FOUND);
    }

    if (reaction.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_DELETE_OWN_REACTIONS);
    }

    // Hard delete reaction; like/dislike counts are computed dynamically from reactions
    await this.reactionRepository.delete(reaction.id);
  }
}
