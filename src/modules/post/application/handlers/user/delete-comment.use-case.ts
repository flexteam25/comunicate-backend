import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IPostCommentRepository } from '../../../infrastructure/persistence/repositories/post-comment.repository';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import {
  CommentHasChildService,
  CommentType,
} from '../../../../../shared/services/comment-has-child.service';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { PostComment } from '../../../domain/entities/post-comment.entity';

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
    private readonly commentHasChildService: CommentHasChildService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentRepository.findById(command.commentId, ['post']);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== command.userId) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    // Store parentCommentId before deletion for async update
    const parentCommentId = comment.parentCommentId;

    // Delete parent and all children recursively within a transaction
    await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const commentRepo = manager.getRepository(PostComment);

        // Soft delete all children recursively first
        await this.commentRepository.deleteAllChildrenRecursive(
          command.commentId,
          manager,
        );

        // Soft delete parent comment
        await commentRepo.softDelete(command.commentId);
      },
    );

    // Update has_child for parent comment asynchronously
    if (parentCommentId) {
      void this.commentHasChildService.updateHasChildAsync(
        CommentType.POST,
        parentCommentId,
      );
    }
  }
}
