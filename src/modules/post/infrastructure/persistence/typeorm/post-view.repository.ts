import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostView } from '../../../domain/entities/post-view.entity';
import { IPostViewRepository } from '../repositories/post-view.repository';

@Injectable()
export class PostViewRepository implements IPostViewRepository {
  constructor(
    @InjectRepository(PostView)
    private readonly repository: Repository<PostView>,
  ) {}

  async create(view: Partial<PostView>): Promise<PostView | null> {
    // Only track views for authenticated users (skip anonymous)
    // Return null silently without throwing error to avoid breaking API
    if (!view.userId) {
      return null;
    }

    // Check if view already exists for this user and post
    const existing = await this.repository.findOne({
      where: {
        postId: view.postId,
        userId: view.userId,
      },
    });

    if (existing) {
      // View already exists, return existing record
      return existing;
    }

    const entity = this.repository.create(view);
    return this.repository.save(entity);
  }
}
