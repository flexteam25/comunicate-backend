import { Injectable, Inject } from '@nestjs/common';
import { PostComment } from '../../../domain/entities/post-comment.entity';
import { IPostCommentRepository } from '../../../infrastructure/persistence/repositories/post-comment.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListCommentsCommand {
  postId: string;
  parentCommentId?: string | null;
  cursor?: string;
  limit?: number;
  userId?: string;
}

@Injectable()
export class ListCommentsUseCase {
  constructor(
    @Inject('IPostCommentRepository')
    private readonly commentRepository: IPostCommentRepository,
  ) {}

  async execute(
    command: ListCommentsCommand,
  ): Promise<CursorPaginationResult<PostComment>> {
    return this.commentRepository.findByPostId(
      command.postId,
      command.parentCommentId,
      command.cursor,
      command.limit,
      command.userId,
    );
  }
}
