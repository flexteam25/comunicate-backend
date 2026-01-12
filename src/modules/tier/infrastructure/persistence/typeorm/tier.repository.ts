import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tier } from '../../../domain/entities/tier.entity';
import { ITierRepository } from '../repositories/tier.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class TierRepository implements ITierRepository {
  constructor(
    @InjectRepository(Tier)
    private readonly repository: Repository<Tier>,
  ) {}

  async findAll(isActive: number | null = null): Promise<Tier[]> {
    const where: Record<string, any> = { deletedAt: null };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.find({
      where,
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: string, isActive: number | null = null): Promise<Tier | null> {
    const where: Record<string, any> = { id, deletedAt: null };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.findOne({
      where,
    });
  }

  async findByIdIncludingDeleted(
    id: string,
    isActive: number | null = null,
  ): Promise<Tier | null> {
    const where: Record<string, any> = { id };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.findOne({
      where,
      withDeleted: true,
    });
  }

  async create(tier: Partial<Tier>): Promise<Tier> {
    const entity = this.repository.create(tier);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<Tier>): Promise<Tier> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.TIER_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Soft delete: set deletedAt timestamp
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }
}
