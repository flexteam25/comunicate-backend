import { Tier } from '../../../domain/entities/tier.entity';

export interface ITierRepository {
  findAll(isActive?: number | null): Promise<Tier[]>;
  findById(id: string, isActive?: number | null): Promise<Tier | null>;
  findByIdIncludingDeleted(id: string, isActive?: number | null): Promise<Tier | null>;
  create(tier: Partial<Tier>): Promise<Tier>;
  update(id: string, data: Partial<Tier>): Promise<Tier>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
