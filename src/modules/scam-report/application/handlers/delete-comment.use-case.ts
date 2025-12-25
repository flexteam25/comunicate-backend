import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IScamReportCommentRepository } from '../../infrastructure/persistence/repositories/scam-report-comment.repository';
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
    @Inject('IScamReportCommentRepository')
    private readonly scamReportCommentRepository: IScamReportCommentRepository,
    private readonly commentHasChildService: CommentHasChildService,
  ) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.scamReportCommentRepository.findById(command.commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Store parentCommentId before deletion for async update
    const parentCommentId = comment.parentCommentId;

    await this.scamReportCommentRepository.delete(command.commentId);

    // Update has_child for parent comment asynchronously
    if (parentCommentId) {
      void this.commentHasChildService.updateHasChildAsync(
        CommentType.SCAM_REPORT,
        parentCommentId,
      );
    }
  }
}
