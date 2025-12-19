import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IScamReportCommentRepository } from '../../infrastructure/persistence/repositories/scam-report-comment.repository';

export interface DeleteCommentCommand {
  commentId: string;
  userId: string;
}

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject('IScamReportCommentRepository')
    private readonly scamReportCommentRepository: IScamReportCommentRepository,
  ) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.scamReportCommentRepository.findById(command.commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.scamReportCommentRepository.delete(command.commentId);
  }
}
