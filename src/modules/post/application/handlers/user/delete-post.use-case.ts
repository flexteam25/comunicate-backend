import { Injectable, Inject } from '@nestjs/common';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UserPost } from '../../../../user/domain/entities/user-post.entity';

export interface DeletePostCommand {
  postId: string;
  userId: string;
}

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: DeletePostCommand): Promise<void> {
    const post = await this.postRepository.findById(command.postId);
    if (!post) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    // Check ownership
    if (post.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_DELETE_OWN_POSTS);
    }

    // Check time limit: can only delete within 1 hour after creation
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in milliseconds
    if (post.createdAt < oneHourAgo) {
      throw forbidden(MessageKeys.CAN_ONLY_DELETE_POSTS_WITHIN_ONE_HOUR);
    }

    // Soft delete post and user_posts in transaction
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      // Soft delete post
      await this.postRepository.delete(command.postId);

      // Soft delete user_posts
      const userPostRepo = manager.getRepository(UserPost);
      await userPostRepo.softDelete({
        userId: command.userId,
        postId: command.postId,
      });
    });
  }
}
