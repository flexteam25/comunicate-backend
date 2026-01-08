import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostCommentReaction } from '../../../domain/entities/post-comment-reaction.entity';
import { IPostCommentReactionRepository } from '../repositories/post-comment-reaction.repository';

@Injectable()
export class PostCommentReactionRepository implements IPostCommentReactionRepository {
  constructor(
    @InjectRepository(PostCommentReaction)
    private readonly repository: Repository<PostCommentReaction>,
  ) {}

  async findByCommentIdAndUserId(
    commentId: string,
    userId: string,
  ): Promise<PostCommentReaction | null> {
    return this.repository.findOne({
      where: { commentId, userId },
    });
  }

  async create(reaction: Partial<PostCommentReaction>): Promise<PostCommentReaction> {
    const entity = this.repository.create(reaction);
    return this.repository.save(entity);
  }

  async update(
    id: string,
    data: Partial<PostCommentReaction>,
  ): Promise<PostCommentReaction> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('PostCommentReaction not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
