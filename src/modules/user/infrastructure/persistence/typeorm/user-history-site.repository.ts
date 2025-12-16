import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserHistorySite } from '../../../domain/entities/user-history-site.entity';
import { IUserHistorySiteRepository } from '../repositories/user-history-site.repository';

@Injectable()
export class UserHistorySiteRepository implements IUserHistorySiteRepository {
  constructor(
    @InjectRepository(UserHistorySite)
    private readonly repository: Repository<UserHistorySite>,
  ) {}

  async addHistory(userId: string, siteId: string): Promise<void> {
    if (!userId) {
      return;
    }

    // Remove existing history for same (userId, siteId) to avoid duplicates
    await this.repository.delete({ userId, siteId });

    // Create new history entry (will become the most recent)
    const entity = this.repository.create({ userId, siteId });
    await this.repository.save(entity);

    // Keep only the 50 most recent history entries per user
    const itemsToKeep = 50;

    const histories = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: itemsToKeep,
    });

    if (histories.length > 0) {
      const idsToDelete = histories.map((h) => h.id);
      await this.repository.delete(idsToDelete);
    }
  }

  async findRecentHistory(
    userId: string,
    limit: number,
  ): Promise<{ siteId: string; createdAt: Date }[]> {
    const histories = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return histories.map((h) => ({
      siteId: h.siteId,
      createdAt: h.createdAt,
    }));
  }
}
