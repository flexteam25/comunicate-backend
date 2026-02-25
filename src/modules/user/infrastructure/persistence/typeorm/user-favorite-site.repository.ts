import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IUserFavoriteSiteRepository,
  UserFavoriteSiteFilters,
} from '../repositories/user-favorite-site.repository';
import { UserFavoriteSite } from '../../../domain/entities/user-favorite-site.entity';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';

@Injectable()
export class UserFavoriteSiteRepository implements IUserFavoriteSiteRepository {
  constructor(
    @InjectRepository(UserFavoriteSite)
    private readonly repository: Repository<UserFavoriteSite>,
  ) {}

  async addFavorite(userId: string, siteId: string): Promise<void> {
    const existing = await this.repository.findOne({
      where: { userId, siteId },
    });

    if (!existing) {
      const entity = this.repository.create({ userId, siteId });
      await this.repository.save(entity);
    }
  }

  async removeFavorite(userId: string, siteId: string): Promise<void> {
    await this.repository.delete({ userId, siteId });
  }

  async isFavorite(userId: string, siteId: string): Promise<boolean> {
    const existing = await this.repository.findOne({
      where: { userId, siteId },
    });
    return !!existing;
  }

  async listFavorites(
    filters: UserFavoriteSiteFilters,
    cursor?: string,
    limit = 10,
  ): Promise<{
    data: {
      id: string;
      siteId: string;
      createdAt: Date;
    }[];
    nextCursor: string | null;
  }> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({ userId: filters.userId });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const rows = await this.repository.find({
      where: { userId: filters.userId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: realLimit + 1,
    });

    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit).map((row) => ({
      id: row.id,
      siteId: row.siteId,
      createdAt: row.createdAt,
    }));

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;

    return {
      data,
      nextCursor,
    };
  }
}
