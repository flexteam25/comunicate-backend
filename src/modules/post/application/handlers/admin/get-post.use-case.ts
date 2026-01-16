import { Injectable, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface GetPostCommand {
  postId: string;
}

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(command: GetPostCommand): Promise<Post> {
    const post = await this.postRepository.findByIdOrSlugWithAggregates(command.postId);

    if (!post) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    return post;
  }
}
