import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';

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
    const post = await this.postRepository.findByIdWithAggregates(command.postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }
}
