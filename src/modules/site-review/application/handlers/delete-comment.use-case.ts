import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISiteReviewCommentRepository } from '../../infrastructure/persistence/repositories/site-review-comment.repository';

export interface DeleteCommentCommand {
  commentId: string;
  userId: string;
}

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject('ISiteReviewCommentRepository')
    private readonly commentRepository: ISiteReviewCommentRepository,
  ) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentRepository.findById(command.commentId);

    if (!comment) {
      throw new NotFoundException('Site review comment not found');
    }

    if (comment.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.delete(command.commentId);
  }
}
