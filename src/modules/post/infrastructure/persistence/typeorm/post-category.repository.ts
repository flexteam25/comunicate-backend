import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import { IPostCategoryRepository } from '../repositories/post-category.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class PostCategoryRepository implements IPostCategoryRepository {
  constructor(
    @InjectRepository(PostCategory)
    private readonly repository: Repository<PostCategory>,
  ) {}

  async findById(id: string): Promise<PostCategory | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
    });
  }

  async findAll(): Promise<PostCategory[]> {
    return this.repository
      .createQueryBuilder('category')
      .where('category.deletedAt IS NULL')
      .orderBy('category.order', 'ASC', 'NULLS LAST')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  async findByName(name: string): Promise<PostCategory | null> {
    return this.repository.findOne({
      where: { name, deletedAt: null },
    });
  }

  async create(category: Partial<PostCategory>): Promise<PostCategory> {
    const entity = this.repository.create(category);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<PostCategory>): Promise<PostCategory> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.POST_CATEGORY_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Soft delete (kept for backward compatibility if needed)
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }
}
