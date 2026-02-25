import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSearchSite } from '../../../domain/entities/user-search-site.entity';
import { IUserSearchSiteRepository } from '../repositories/user-search-site.repository';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';

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
    cursor?: string,
    limit = 20,
  ): Promise<{
    data: { searchQuery: string; createdAt: Date }[];
    nextCursor: string | null;
    prevCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({ userId });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const rows = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: realLimit + 1,
    });

    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit).map((h) => ({
      searchQuery: h.searchQuery,
      createdAt: h.createdAt,
    }));

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return { data, nextCursor, prevCursor };
  }

  async findRecentSearchHistoryWithIds(
    userId: string,
    limit: number,
  ): Promise<Array<{ id: string; searchQuery: string; createdAt: Date }>> {
    const histories = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return histories.map((h) => ({
      id: h.id,
      searchQuery: h.searchQuery,
      createdAt: h.createdAt,
    }));
  }

  async deleteByIds(userId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...ids)', { ids })
      .andWhere('userId = :userId', { userId })
      .execute();
  }

  async deleteAll(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }
}
