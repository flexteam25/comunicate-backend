import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteView } from '../../../domain/entities/site-view.entity';
import { ISiteViewRepository } from '../repositories/site-view.repository';

@Injectable()
export class SiteViewRepository implements ISiteViewRepository {
  constructor(
    @InjectRepository(SiteView)
    private readonly repository: Repository<SiteView>,
  ) {}

  async create(view: Partial<SiteView>): Promise<SiteView | null> {
    // Only track views for authenticated users (skip anonymous)
    // Return null silently without throwing error to avoid breaking API
    if (!view.userId) {
      return null;
    }

    // Check if view already exists for this user and site
    const existing = await this.repository.findOne({
      where: {
        siteId: view.siteId,
        userId: view.userId,
      },
    });

    if (existing) {
      // View already exists, return existing record
      return existing;
    }

    const entity = this.repository.create(view);
    return this.repository.save(entity);
  }
}
