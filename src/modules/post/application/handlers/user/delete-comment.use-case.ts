import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IPostCommentRepository } from '../../../infrastructure/persistence/repositories/post-comment.repository';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';

export interface DeleteCommentCommand {
  commentId: string;
  userId: string;
}

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject('IPostCommentRepository')
    private readonly commentRepository: IPostCommentRepository,
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentRepository.findById(command.commentId, ['post']);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== command.userId) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    // Soft delete parent comment
    await this.commentRepository.delete(command.commentId);

    // Reparent direct children to root so they remain visible
    await this.commentRepository.reparentChildrenToRoot(command.commentId);
  }
}
