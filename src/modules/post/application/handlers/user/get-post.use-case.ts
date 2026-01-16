import { Injectable, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { IPostViewRepository } from '../../../infrastructure/persistence/repositories/post-view.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
    const post = await this.postRepository.findByIdOrSlugWithAggregates(
      command.postId,
      command.userId,
    );

    if (!post) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    if (!post.isPublished) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    // Track view only for authenticated users (best-effort, don't block on errors)
    if (command.userId) {
      try {
        // Use post.id (UUID) for view tracking, not the slug
        await this.postViewRepository.create({
          postId: post.id,
          userId: command.userId,
          ipAddress: command.ipAddress || 'unknown',
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to track post view:', error);
      }
    }

    return post;
  }
}
