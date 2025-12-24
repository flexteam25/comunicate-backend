import {
  PostReaction,
  ReactionType,
} from '../../../domain/entities/post-reaction.entity';

export interface IPostReactionRepository {
  findByPostIdAndUserId(postId: string, userId: string): Promise<PostReaction | null>;
  create(reaction: Partial<PostReaction>): Promise<PostReaction>;
  update(id: string, data: Partial<PostReaction>): Promise<PostReaction>;
  delete(id: string): Promise<void>;
}
