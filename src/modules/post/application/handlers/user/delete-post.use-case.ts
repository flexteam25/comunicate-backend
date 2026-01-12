import { Injectable, Inject } from '@nestjs/common';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeletePostCommand {
  postId: string;
  userId: string;
}

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
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

    // Soft delete
    await this.postRepository.delete(command.postId);
  }
}
