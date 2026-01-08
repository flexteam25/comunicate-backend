import { PostCommentReaction } from '../../../domain/entities/post-comment-reaction.entity';
import { ReactionType } from '../../../domain/entities/post-reaction.entity';

export interface IPostCommentReactionRepository {
  findByCommentIdAndUserId(
    commentId: string,
    userId: string,
  ): Promise<PostCommentReaction | null>;
  create(reaction: Partial<PostCommentReaction>): Promise<PostCommentReaction>;
  update(id: string, data: Partial<PostCommentReaction>): Promise<PostCommentReaction>;
  delete(id: string): Promise<void>;
}
