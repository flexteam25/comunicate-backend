import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostViewRepository } from '../../../infrastructure/persistence/repositories/post-view.repository';

export interface GetPostCommand {
  postId: string;
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
    @Inject('IPostViewRepository')
    private readonly postViewRepository: IPostViewRepository,
  ) {}

  async execute(command: GetPostCommand): Promise<Post> {
    const post = await this.postRepository.findByIdWithAggregates(command.postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.isPublished) {
      throw new NotFoundException('Post not found');
    }

    // Track view (best-effort, don't block on errors)
    try {
      await this.postViewRepository.create({
        postId: command.postId,
        userId: command.userId,
        ipAddress: command.ipAddress || 'unknown',
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to track post view:', error);
    }

    return post;
  }
}
