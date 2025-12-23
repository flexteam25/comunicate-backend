import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostReaction } from '../../../domain/entities/post-reaction.entity';
import { IPostReactionRepository } from '../repositories/post-reaction.repository';

@Injectable()
export class PostReactionRepository implements IPostReactionRepository {
  constructor(
    @InjectRepository(PostReaction)
    private readonly repository: Repository<PostReaction>,
  ) {}

  async findByPostIdAndUserId(
    postId: string,
    userId: string,
  ): Promise<PostReaction | null> {
    return this.repository.findOne({
      where: { postId, userId },
    });
  }

  async create(reaction: Partial<PostReaction>): Promise<PostReaction> {
    const entity = this.repository.create(reaction);
    return this.repository.save(entity);
  }

  async update(
    id: string,
    data: Partial<PostReaction>,
  ): Promise<PostReaction> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('PostReaction not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
