import { Injectable, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListPublicPostsCommand {
  categoryId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListPublicPostsUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(command: ListPublicPostsCommand): Promise<CursorPaginationResult<Post>> {
    return this.postRepository.findPublished(
      {
        categoryId: command.categoryId,
        search: command.search,
        sortBy: command.sortBy,
        sortOrder: command.sortOrder,
      },
      command.cursor,
      command.limit,
    );
  }
}
