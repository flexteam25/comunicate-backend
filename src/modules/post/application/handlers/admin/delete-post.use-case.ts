import { Injectable, Inject } from '@nestjs/common';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    await this.postRepository.delete(command.postId);
  }
}
