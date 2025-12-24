import { Injectable, Inject } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListPostsCommand {
  isPublished?: boolean;
  categoryId?: string;
  userId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListPostsUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(command: ListPostsCommand): Promise<CursorPaginationResult<Post>> {
    return this.postRepository.findAllAdmin(
      {
        isPublished: command.isPublished,
        categoryId: command.categoryId,
        userId: command.userId,
        search: command.search,
        sortBy: command.sortBy,
        sortOrder: command.sortOrder,
      },
      command.cursor,
      command.limit,
    );
  }
}
