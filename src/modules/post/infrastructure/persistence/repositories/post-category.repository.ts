import { PostCategory } from '../../../domain/entities/post-category.entity';

export interface IPostCategoryRepository {
  findById(id: string): Promise<PostCategory | null>;
  findAll(options?: { sortBy?: 'order' | 'orderInMain'; sortDir?: 'ASC' | 'DESC' }): Promise<PostCategory[]>;
  findByName(name: string): Promise<PostCategory | null>;
  create(category: Partial<PostCategory>): Promise<PostCategory>;
  update(id: string, data: Partial<PostCategory>): Promise<PostCategory>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
