import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostReaction } from '../../../domain/entities/post-reaction.entity';
import { IPostReactionRepository } from '../repositories/post-reaction.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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

  async update(id: string, data: Partial<PostReaction>): Promise<PostReaction> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw notFound(MessageKeys.POST_REACTION_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
