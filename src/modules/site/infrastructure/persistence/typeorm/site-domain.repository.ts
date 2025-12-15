import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteDomain } from '../../../domain/entities/site-domain.entity';
import { ISiteDomainRepository } from '../repositories/site-domain.repository';

@Injectable()
export class SiteDomainRepository implements ISiteDomainRepository {
  constructor(
    @InjectRepository(SiteDomain)
    private readonly repository: Repository<SiteDomain>,
  ) {}

  async findById(id: string): Promise<SiteDomain | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByDomain(domain: string): Promise<SiteDomain | null> {
    return this.repository.findOne({ where: { domain } });
  }

  async findBySiteId(siteId: string): Promise<SiteDomain[]> {
    return this.repository.find({
      where: { siteId },
      order: { createdAt: 'DESC' },
    });
  }

  async findCurrentBySiteId(siteId: string): Promise<SiteDomain | null> {
    return this.repository.findOne({
      where: { siteId, isCurrent: true },
    });
  }

  async create(data: Partial<SiteDomain>): Promise<SiteDomain> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<SiteDomain>): Promise<SiteDomain> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('SiteDomain not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async unsetCurrentForSite(siteId: string, exceptId?: string): Promise<void> {
    const qb = this.repository
      .createQueryBuilder()
      .update(SiteDomain)
      .set({ isCurrent: false })
      .where('site_id = :siteId', { siteId });
    if (exceptId) {
      qb.andWhere('id != :exceptId', { exceptId });
    }
    await qb.execute();
  }
}

