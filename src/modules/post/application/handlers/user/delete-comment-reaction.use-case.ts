import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IPostCommentReactionRepository } from '../../../infrastructure/persistence/repositories/post-comment-reaction.repository';

export interface DeleteCommentReactionCommand {
  commentId: string;
  userId: string;
}

@Injectable()
export class DeleteCommentReactionUseCase {
  constructor(
    @Inject('IPostCommentReactionRepository')
    private readonly reactionRepository: IPostCommentReactionRepository,
  ) {}

  async execute(command: DeleteCommentReactionCommand): Promise<void> {
    const reaction =
      await this.reactionRepository.findByCommentIdAndUserId(
        command.commentId,
        command.userId,
      );

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    if (reaction.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own reactions');
    }

    await this.reactionRepository.delete(reaction.id);
  }
}
