import { Site } from '../../../domain/entities/site.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface SiteFilters {
  categoryId?: string;
  tierId?: string;
  status?: string;
  search?: string;
}

export interface ISiteRepository {
  findById(id: string, relations?: string[]): Promise<Site | null>;
  findByIdIncludingDeleted(id: string): Promise<Site | null>;
  findAllWithCursor(
    filters?: SiteFilters,
    cursor?: string,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<CursorPaginationResult<Site>>;
  create(site: Partial<Site>): Promise<Site>;
  update(id: string, data: Partial<Site>): Promise<Site>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  findByCategory(categoryId: string): Promise<Site[]>;
  findByTier(tierId: string): Promise<Site[]>;
  findByIds(ids: string[]): Promise<Site[]>;
}
