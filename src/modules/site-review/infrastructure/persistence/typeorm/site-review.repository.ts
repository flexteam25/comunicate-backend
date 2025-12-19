import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteReview } from '../../../domain/entities/site-review.entity';
import { ISiteReviewRepository } from '../repositories/site-review.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class SiteReviewRepository implements ISiteReviewRepository {
  constructor(
    @InjectRepository(SiteReview)
    private readonly repository: Repository<SiteReview>,
    @Optional()
    @Inject('ISiteRepository')
    private readonly siteRepository?: any,
  ) {}

  async findById(id: string, relations?: string[]): Promise<SiteReview | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('review')
      .where('review.id = :id', { id })
      .andWhere('review.deletedAt IS NULL');

    if (relations?.includes('user')) {
      queryBuilder.leftJoinAndSelect('review.user', 'user');
    }
    if (relations?.includes('site')) {
      queryBuilder.leftJoinAndSelect('review.site', 'site');
    }

    queryBuilder.addSelect(
      (subQuery) =>
        subQuery
          .select('COUNT(reaction.id)', 'likeCount')
          .from('site_review_reactions', 'reaction')
          .where('reaction.review_id = review.id')
          .andWhere("reaction.reaction_type = 'like'"),
      'likeCount',
    );
    queryBuilder.addSelect(
      (subQuery) =>
        subQuery
          .select('COUNT(reaction.id)', 'dislikeCount')
          .from('site_review_reactions', 'reaction')
          .where('reaction.review_id = review.id')
          .andWhere("reaction.reaction_type = 'dislike'"),
      'dislikeCount',
    );
    queryBuilder.loadRelationCountAndMap(
      'review.commentCount',
      'review.comments',
      'comment',
      (qb) => qb.andWhere('comment.deletedAt IS NULL'),
    );

    const result = await queryBuilder.getRawAndEntities();
    if (result.entities.length === 0) {
      return null;
    }

    const review = result.entities[0];
    const rawData = result.raw[0];
    (review as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
    (review as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);

    return review;
  }

  async findBySiteIdAndUserId(
    siteId: string,
    userId: string,
  ): Promise<SiteReview | null> {
    return this.repository.findOne({
      where: { siteId, userId, deletedAt: null },
    });
  }

  async findBySiteId(
    siteId: string,
    filters?: {
      isPublished?: boolean;
      rating?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteReview>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.site', 'site')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('site_review_reactions', 'reaction')
            .where('reaction.review_id = review.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('site_review_reactions', 'reaction')
            .where('reaction.review_id = review.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .loadRelationCountAndMap(
        'review.commentCount',
        'review.comments',
        'comment',
        (qb) => qb.andWhere('comment.deletedAt IS NULL'),
      )
      .where('review.siteId = :siteId', { siteId })
      .andWhere('review.deletedAt IS NULL');

    if (filters?.isPublished !== undefined) {
      queryBuilder.andWhere('review.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    if (filters?.rating) {
      queryBuilder.andWhere('review.rating = :rating', {
        rating: filters.rating,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere('LOWER(review.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `review.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND review.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND review.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('review.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('review.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`review.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`review.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('review.id', sortOrder);
    queryBuilder.take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    data.forEach((review, index) => {
      const rawData = raw[index];
      (review as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
      (review as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
    });

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue as string | number | Date;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async findAll(
    filters?: {
      siteId?: string;
      userId?: string;
      isPublished?: boolean;
      rating?: number;
      search?: string;
      searchByReviewerName?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteReview>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.site', 'site')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('site_review_reactions', 'reaction')
            .where('reaction.review_id = review.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('site_review_reactions', 'reaction')
            .where('reaction.review_id = review.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .loadRelationCountAndMap(
        'review.commentCount',
        'review.comments',
        'comment',
        (qb) => qb.andWhere('comment.deletedAt IS NULL'),
      )
      .where('review.deletedAt IS NULL');

    if (filters?.siteId) {
      queryBuilder.andWhere('review.siteId = :siteId', {
        siteId: filters.siteId,
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('review.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.isPublished !== undefined) {
      queryBuilder.andWhere('review.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    if (filters?.rating) {
      queryBuilder.andWhere('review.rating = :rating', {
        rating: filters.rating,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(LOWER(review.title) LIKE LOWER(:search) OR LOWER(user.displayName) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    } else if (filters?.searchByReviewerName) {
      queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:searchByReviewerName)', {
        searchByReviewerName: `%${filters.searchByReviewerName}%`,
      });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `review.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND review.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND review.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('review.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('review.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`review.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`review.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('review.id', sortOrder);
    queryBuilder.take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    data.forEach((review, index) => {
      const rawData = raw[index];
      (review as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
      (review as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
    });

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue as string | number | Date;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async findByUserId(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteReview>> {
    const realLimit = limit > 50 ? 50 : limit;
    const queryBuilder = this.repository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.site', 'site')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('site_review_reactions', 'reaction')
            .where('reaction.review_id = review.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('site_review_reactions', 'reaction')
            .where('reaction.review_id = review.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .loadRelationCountAndMap(
        'review.commentCount',
        'review.comments',
        'comment',
        (qb) => qb.andWhere('comment.deletedAt IS NULL'),
      )
      .where('review.userId = :userId', { userId })
      .andWhere('review.deletedAt IS NULL');

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue) {
          const sortDate = new Date(sortValue);
          queryBuilder.andWhere(
            '(review.createdAt < :sortDate OR (review.createdAt = :sortDate AND review.id < :cursorId))',
            { sortDate, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('review.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('review.createdAt', 'DESC')
      .addOrderBy('review.id', 'DESC')
      .take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    data.forEach((review, index) => {
      const rawData = raw[index];
      (review as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
      (review as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
    });

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async create(review: Partial<SiteReview>): Promise<SiteReview> {
    const entity = this.repository.create(review);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<SiteReview>): Promise<SiteReview> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Review not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async recalculateSiteStatistics(siteId: string): Promise<void> {
    const result = await this.repository
      .createQueryBuilder('review')
      .select('COUNT(review.id)', 'count')
      .addSelect('AVG(review.rating)', 'avg')
      .where('review.siteId = :siteId', { siteId })
      .andWhere('review.isPublished = :isPublished', { isPublished: true })
      .andWhere('review.deletedAt IS NULL')
      .getRawOne();

    const reviewCount = parseInt(result?.count || '0', 10);
    const averageRating = result?.avg ? parseFloat(result.avg) : 0;

    // Update site statistics using raw query to avoid circular dependency
    await this.repository.manager.query(
      `UPDATE sites 
       SET review_count = $1, average_rating = $2 
       WHERE id = $3`,
      [reviewCount, parseFloat(averageRating.toFixed(2)), siteId],
    );
  }
}
