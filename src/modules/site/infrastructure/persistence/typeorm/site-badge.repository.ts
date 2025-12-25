import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteBadge } from '../../../domain/entities/site-badge.entity';
import { ISiteBadgeRepository } from '../repositories/site-badge.repository';

@Injectable()
export class SiteBadgeRepository implements ISiteBadgeRepository {
  constructor(
    @InjectRepository(SiteBadge)
    private readonly repository: Repository<SiteBadge>,
  ) {}

  async findBySiteId(siteId: string): Promise<SiteBadge[]> {
    return this.repository
      .createQueryBuilder('siteBadge')
      .leftJoinAndSelect('siteBadge.badge', 'badge')
      .where('siteBadge.siteId = :siteId', { siteId })
      .andWhere('badge.deletedAt IS NULL')
      .getMany();
  }

  async assignBadge(siteId: string, badgeId: string): Promise<SiteBadge> {
    // Check if already assigned
    const existing = await this.repository.findOne({
      where: { siteId, badgeId },
    });

    if (existing) {
      return existing;
    }

    const entity = this.repository.create({ siteId, badgeId });
    return this.repository.save(entity);
  }

  async removeBadge(siteId: string, badgeId: string): Promise<void> {
    await this.repository.delete({ siteId, badgeId });
  }

  async hasBadge(siteId: string, badgeId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { siteId, badgeId },
    });
    return count > 0;
  }
}
