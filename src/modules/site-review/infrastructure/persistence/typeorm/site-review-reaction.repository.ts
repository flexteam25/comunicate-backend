import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteReviewReaction } from '../../../domain/entities/site-review-reaction.entity';
import { ISiteReviewReactionRepository } from '../repositories/site-review-reaction.repository';

@Injectable()
export class SiteReviewReactionRepository implements ISiteReviewReactionRepository {
  constructor(
    @InjectRepository(SiteReviewReaction)
    private readonly repository: Repository<SiteReviewReaction>,
  ) {}

  async findByReviewIdAndUserId(
    reviewId: string,
    userId: string,
  ): Promise<SiteReviewReaction | null> {
    return this.repository.findOne({
      where: { siteReviewId: reviewId, userId },
    });
  }

  async create(reaction: Partial<SiteReviewReaction>): Promise<SiteReviewReaction> {
    const entity = this.repository.create(reaction);
    return this.repository.save(entity);
  }

  async update(
    id: string,
    data: Partial<SiteReviewReaction>,
  ): Promise<SiteReviewReaction> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Reaction not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
