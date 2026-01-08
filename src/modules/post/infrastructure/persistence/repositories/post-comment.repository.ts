import { PostComment } from '../../../domain/entities/post-comment.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IPostCommentRepository {
  findById(id: string, relations?: string[]): Promise<PostComment | null>;
  findByPostId(
    postId: string,
    parentCommentId?: string | null,
    cursor?: string,
    limit?: number,
    userId?: string,
  ): Promise<CursorPaginationResult<PostComment>>;
  create(comment: Partial<PostComment>): Promise<PostComment>;
  update(id: string, data: Partial<PostComment>): Promise<PostComment>;
  delete(id: string): Promise<void>;
  reparentChildrenToRoot(parentCommentId: string): Promise<void>;
}
