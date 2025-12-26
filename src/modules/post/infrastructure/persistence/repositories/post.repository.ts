import { Post } from '../../../domain/entities/post.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IPostRepository {
  findById(id: string, relations?: string[]): Promise<Post | null>;
  findByIdWithAggregates(id: string, userId?: string): Promise<Post | null>;
  findByTitle(title: string, excludePostId?: string): Promise<Post | null>;
  findAllAdmin(
    filters?: {
      isPublished?: boolean;
      categoryId?: string;
      userId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<Post>>;
  findPublished(
    filters?: {
      categoryId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      userId?: string; // Optional userId to get user's reaction
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<Post>>;
  create(post: Partial<Post>): Promise<Post>;
  update(id: string, data: Partial<Post>): Promise<Post>;
  delete(id: string): Promise<void>;
}
