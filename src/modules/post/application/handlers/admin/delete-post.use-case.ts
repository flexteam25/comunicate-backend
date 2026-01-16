import { Injectable, Inject } from '@nestjs/common';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { UserPost } from '../../../../user/domain/entities/user-post.entity';

export interface DeletePostCommand {
  postId: string;
}

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: DeletePostCommand): Promise<void> {
    // Support both UUID and slug
    const post = await this.postRepository.findByIdOrSlug(command.postId);
    if (!post) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    // Soft delete post and user_posts in transaction
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      // Soft delete post (use post.id which is UUID)
      await this.postRepository.delete(post.id);

      // Soft delete user_posts if post was created by a user
      if (post.userId) {
        const userPostRepo = manager.getRepository(UserPost);
        await userPostRepo.softDelete({
          userId: post.userId,
          postId: post.id,
        });
      }
    });
  }
}
