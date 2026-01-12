import { PostCategory } from '../../../domain/entities/post-category.entity';

export interface IPostCategoryRepository {
  findById(id: string): Promise<PostCategory | null>;
  findAll(): Promise<PostCategory[]>;
  findAllForUser(): Promise<PostCategory[]>; // Filter adminCreateOnly = false
  findByName(name: string): Promise<PostCategory | null>;
  create(category: Partial<PostCategory>): Promise<PostCategory>;
  update(id: string, data: Partial<PostCategory>): Promise<PostCategory>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
