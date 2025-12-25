import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISiteReviewCommentRepository } from '../../infrastructure/persistence/repositories/site-review-comment.repository';
import {
  CommentHasChildService,
  CommentType,
} from '../../../../shared/services/comment-has-child.service';

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
  ) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentRepository.findById(command.commentId);

    if (!comment) {
      throw new NotFoundException('Site review comment not found');
    }

    if (comment.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Store parentCommentId before deletion for async update
    const parentCommentId = comment.parentCommentId;

    await this.commentRepository.delete(command.commentId);

    // Update has_child for parent comment asynchronously
    if (parentCommentId) {
      void this.commentHasChildService.updateHasChildAsync(
        CommentType.SITE_REVIEW,
        parentCommentId,
      );
    }
  }
}
