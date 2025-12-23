import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';

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
      throw new NotFoundException('Post not found');
    }

    // Check ownership
    if (post.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Check time limit: can only delete within 1 hour after creation
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in milliseconds
    if (post.createdAt < oneHourAgo) {
      throw new ForbiddenException('You can only delete posts within 1 hour after creation');
    }

    // Soft delete
    await this.postRepository.delete(command.postId);
  }
}
