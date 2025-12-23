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

  async create(view: Partial<PostView>): Promise<PostView> {
    const entity = this.repository.create(view);
    return this.repository.save(entity);
  }
}
