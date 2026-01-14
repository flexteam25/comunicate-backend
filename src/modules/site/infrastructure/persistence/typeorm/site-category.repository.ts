import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import { ISiteCategoryRepository } from '../repositories/site-category.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class SiteCategoryRepository implements ISiteCategoryRepository {
  constructor(
    @InjectRepository(SiteCategory)
    private readonly repository: Repository<SiteCategory>,
  ) {}

  async findAll(isActive: number | null = null): Promise<SiteCategory[]> {
    const where: Record<string, any> = { deletedAt: null };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findAllIncludeDeleted(isActive: number | null = null): Promise<SiteCategory[]> {
    const where: Record<string, any> = {};
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.find({
      where,
      withDeleted: true,
      order: { name: 'ASC' },
    });
  }

  async findAllDeleted(isActive: number | null = null): Promise<SiteCategory[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('category')
      .withDeleted()
      .where('category.deleted_at IS NOT NULL');

    if (isActive === 1) {
      queryBuilder.andWhere('category.is_active = :isActive', { isActive: true });
    } else if (isActive === 0) {
      queryBuilder.andWhere('category.is_active = :isActive', { isActive: false });
    }

    queryBuilder.orderBy('category.name', 'ASC');

    return queryBuilder.getMany();
  }

  async findById(
    id: string,
    isActive: number | null = null,
  ): Promise<SiteCategory | null> {
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
  ): Promise<SiteCategory | null> {
    const where: Record<string, any> = { id };
    if (isActive === 1) where.isActive = true;
    if (isActive === 0) where.isActive = false;

    return this.repository.findOne({
      where,
      withDeleted: true,
    });
  }

  async create(category: Partial<SiteCategory>): Promise<SiteCategory> {
    const entity = this.repository.create(category);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<SiteCategory>): Promise<SiteCategory> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.SITE_CATEGORY_NOT_FOUND_AFTER_UPDATE);
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
