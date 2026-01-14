import { Badge } from '../../../domain/entities/badge.entity';

export interface IBadgeRepository {
  findAll(
    isActive?: number | null,
    badgeType?: string,
    sortBy?: string,
    sortDir?: 'ASC' | 'DESC',
  ): Promise<Badge[]>;
  findAllIncludeDeleted(isActive?: number | null, badgeType?: string): Promise<Badge[]>;
  findAllDeleted(
    isActive?: number | null,
    badgeType?: string,
    sortBy?: string,
    sortDir?: 'ASC' | 'DESC',
  ): Promise<Badge[]>;
  findById(id: string, isActive?: number | null): Promise<Badge | null>;
  findByIdIncludingDeleted(id: string, isActive?: number | null): Promise<Badge | null>;
  create(badge: Partial<Badge>): Promise<Badge>;
  update(id: string, data: Partial<Badge>): Promise<Badge>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
