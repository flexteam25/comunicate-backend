import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSearchSite } from '../../../domain/entities/user-search-site.entity';
import { IUserSearchSiteRepository } from '../repositories/user-search-site.repository';

@Injectable()
export class UserSearchSiteRepository implements IUserSearchSiteRepository {
  constructor(
    @InjectRepository(UserSearchSite)
    private readonly repository: Repository<UserSearchSite>,
  ) {}

  async addSearchHistory(userId: string, searchQuery: string): Promise<void> {
    if (!userId || !searchQuery || searchQuery.trim().length === 0) {
      return;
    }

    const trimmedQuery = searchQuery.trim();

    // Remove existing history for same (userId, searchQuery) to avoid duplicates
    await this.repository.delete({ userId, searchQuery: trimmedQuery });

    // Create new history entry (will become the most recent)
    const entity = this.repository.create({ userId, searchQuery: trimmedQuery });
    await this.repository.save(entity);

    // Keep only the 20 most recent history entries per user
    const itemsToKeep = 20;

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

  async findRecentSearchHistory(
    userId: string,
    limit: number,
  ): Promise<{ searchQuery: string; createdAt: Date }[]> {
    const histories = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return histories.map((h) => ({
      searchQuery: h.searchQuery,
      createdAt: h.createdAt,
    }));
  }
}
