import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteManager } from '../../../domain/entities/site-manager.entity';
import { ISiteManagerRepository } from '../repositories/site-manager.repository';

@Injectable()
export class SiteManagerRepository implements ISiteManagerRepository {
  constructor(
    @InjectRepository(SiteManager)
    private readonly repository: Repository<SiteManager>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<SiteManager | null> {
    return this.repository.findOne({
      where: { id },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findBySiteAndUser(siteId: string, userId: string): Promise<SiteManager | null> {
    return this.repository.findOne({
      where: { siteId, userId, isActive: true },
      relations: ['site', 'user'],
    });
  }

  async findBySiteId(siteId: string): Promise<SiteManager[]> {
    return this.repository.find({
      where: { siteId, isActive: true },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByUserId(userId: string): Promise<SiteManager[]> {
    return this.repository.find({
      where: { userId, isActive: true },
      relations: [
        'site',
        'site.category',
        'site.tier',
        'site.siteBadges',
        'site.siteBadges.badge',
        'site.siteDomains',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async create(manager: Partial<SiteManager>): Promise<SiteManager> {
    const entity = this.repository.create(manager);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<SiteManager>): Promise<SiteManager> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('SiteManager not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
