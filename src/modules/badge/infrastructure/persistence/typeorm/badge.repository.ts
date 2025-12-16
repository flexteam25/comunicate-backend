import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../../../domain/entities/badge.entity';
import { IBadgeRepository } from '../repositories/badge.repository';

@Injectable()
export class BadgeRepository implements IBadgeRepository {
  constructor(
    @InjectRepository(Badge)
    private readonly repository: Repository<Badge>,
  ) {}

  async findAll(isActive: number | null = null, badgeType?: string): Promise<Badge[]> {
    const where: Record<string, any> = { deletedAt: null };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;
    if (badgeType) where.badgeType = badgeType;

    return this.repository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findAllIncludeDeleted(
    isActive: number | null = null,
    badgeType?: string,
  ): Promise<Badge[]> {
    const where: Record<string, any> = {};
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;
    if (badgeType) where.badgeType = badgeType;

    return this.repository.find({
      where,
      withDeleted: true,
      order: { name: 'ASC' },
    });
  }

  async findById(id: string, isActive: number | null = null): Promise<Badge | null> {
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
  ): Promise<Badge | null> {
    const where: Record<string, any> = { id };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.findOne({
      where,
      withDeleted: true,
    });
  }

  async create(badge: Partial<Badge>): Promise<Badge> {
    const entity = this.repository.create(badge);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<Badge>): Promise<Badge> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Badge not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }
}
