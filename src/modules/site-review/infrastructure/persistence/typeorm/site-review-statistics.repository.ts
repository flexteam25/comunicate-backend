import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteReviewStatistics, SiteReviewStatisticsType } from '../../../domain/entities/site-review-statistics.entity';
import { ISiteReviewStatisticsRepository } from '../repositories/site-review-statistics.repository';

@Injectable()
export class SiteReviewStatisticsRepository implements ISiteReviewStatisticsRepository {
  constructor(
    @InjectRepository(SiteReviewStatistics)
    private readonly repository: Repository<SiteReviewStatistics>,
  ) {}

  async findBySiteIdAndType(
    siteId: string,
    type: SiteReviewStatisticsType,
    statisticDate?: Date,
  ): Promise<SiteReviewStatistics | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('statistics')
      .where('statistics.siteId = :siteId', { siteId })
      .andWhere('statistics.type = :type', { type });

    if (statisticDate) {
      queryBuilder.andWhere('statistics.statisticDate = :statisticDate', {
        statisticDate: statisticDate.toISOString().split('T')[0],
      });
    } else {
      queryBuilder.andWhere('statistics.statisticDate IS NULL');
    }

    return queryBuilder.getOne();
  }

  async findBySiteIdsAndType(
    siteIds: string[],
    type: SiteReviewStatisticsType,
    statisticDate?: Date,
  ): Promise<SiteReviewStatistics[]> {
    if (siteIds.length === 0) {
      return [];
    }

    const queryBuilder = this.repository
      .createQueryBuilder('statistics')
      .where('statistics.siteId IN (:...siteIds)', { siteIds })
      .andWhere('statistics.type = :type', { type });

    if (statisticDate) {
      queryBuilder.andWhere('statistics.statisticDate = :statisticDate', {
        statisticDate: statisticDate.toISOString().split('T')[0],
      });
    } else {
      queryBuilder.andWhere('statistics.statisticDate IS NULL');
    }

    return queryBuilder.getMany();
  }

  async createOrUpdate(statistics: Partial<SiteReviewStatistics>): Promise<SiteReviewStatistics> {
    const existing = await this.findBySiteIdAndType(
      statistics.siteId!,
      statistics.type!,
      statistics.statisticDate,
    );

    if (existing) {
      Object.assign(existing, statistics);
      return this.repository.save(existing);
    }

    const entity = this.repository.create(statistics);
    return this.repository.save(entity);
  }
}

