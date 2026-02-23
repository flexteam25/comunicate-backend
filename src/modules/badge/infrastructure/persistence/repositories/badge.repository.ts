import { Badge } from '../../../domain/entities/badge.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface BadgeListFilters {
  badgeType?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface IBadgeRepository {
  findAll(
    isActive?: number | null,
    badgeType?: string,
    sortBy?: string,
    sortDir?: 'ASC' | 'DESC',
  ): Promise<Badge[]>;
  findAllWithCursor(
    filters?: BadgeListFilters,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<Badge>>;
  findAllIncludeDeleted(isActive?: number | null, badgeType?: string): Promise<Badge[]>;
  findAllDeleted(
    isActive?: number | null,
    badgeType?: string,
    sortBy?: string,
    sortDir?: 'ASC' | 'DESC',
  ): Promise<Badge[]>;
  findAllDeletedWithCursor(
    filters?: BadgeListFilters,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<Badge>>;
  findById(id: string, isActive?: number | null): Promise<Badge | null>;
  findByIdIncludingDeleted(id: string, isActive?: number | null): Promise<Badge | null>;
  create(badge: Partial<Badge>): Promise<Badge>;
  update(id: string, data: Partial<Badge>): Promise<Badge>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
