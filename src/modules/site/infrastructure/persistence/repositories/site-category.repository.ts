import { SiteCategory } from '../../../domain/entities/site-category.entity';

export interface ISiteCategoryRepository {
  findAll(isActive?: number | null): Promise<SiteCategory[]>;
  findAllIncludeDeleted(isActive?: number | null): Promise<SiteCategory[]>;
  findById(id: string, isActive?: number | null): Promise<SiteCategory | null>;
  findByIdIncludingDeleted(
    id: string,
    isActive?: number | null,
  ): Promise<SiteCategory | null>;
  create(category: Partial<SiteCategory>): Promise<SiteCategory>;
  update(id: string, data: Partial<SiteCategory>): Promise<SiteCategory>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
