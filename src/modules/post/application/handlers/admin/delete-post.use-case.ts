import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';

export interface DeletePostCommand {
  postId: string;
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

    await this.postRepository.delete(command.postId);
  }
}
