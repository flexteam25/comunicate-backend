import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { SiteReview } from '../../../domain/entities/site-review.entity';
import { ISiteReviewRepository } from '../repositories/site-review.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

import { isUuid } from '../../../../../shared/utils/uuid.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
    if (relations?.includes('images')) {
      queryBuilder.leftJoinAndSelect('review.images', 'images');
    } else {
      // Always load images if not explicitly excluded
      queryBuilder.leftJoinAndSelect('review.images', 'images');
    }

    if (relations?.includes('user.userBadges')) {
      queryBuilder.leftJoinAndSelect('user.userBadges', 'userBadges');
    }
    if (relations?.includes('user.userBadges.badge')) {
      queryBuilder.leftJoinAndSelect(
        'userBadges.badge',
        'badge',
        'badge.deletedAt IS NULL',
      );
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
    const filterKey = JSON.stringify({
      siteId,
      isPublished: filters?.isPublished ?? null,
      rating: filters?.rating ?? null,
      search: filters?.search ?? null,
      sortBy,
      sortOrder,
    });

    const queryBuilder = this.repository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('review.site', 'site')
      .leftJoinAndSelect('review.images', 'images')
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

    // Filter by siteId (UUID or slug)
    if (isUuid(siteId)) {
      // Filter by site UUID
      queryBuilder.andWhere('review.siteId = :siteId', { siteId });
    } else {
      // Filter by site slug
      queryBuilder.andWhere('site.slug = :siteSlug', { siteSlug: siteId });
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
      queryBuilder.andWhere('LOWER(review.content) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    let decodedId: string | undefined;
    let decodedSortValue: string | undefined;
    let direction: 'forward' | 'backward' = 'forward';

    if (cursor) {
      try {
        const {
          id,
          sortValue,
          direction: decodedDirection,
          filterKey: cursorFilterKey,
        } = CursorPaginationUtil.decodeCursor(cursor);

        if (cursorFilterKey && cursorFilterKey !== filterKey) {
          decodedId = undefined;
          decodedSortValue = undefined;
        } else {
          decodedId = id;
          if (sortValue !== null && sortValue !== undefined) {
            decodedSortValue = sortValue;
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const sortDefinition = `${sortBy}:${sortOrder},id:${sortOrder}`;

    if (!decodedId || direction === 'forward') {
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(`review.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.orderBy(`review.${sortBy}`, 'ASC');
      }
      queryBuilder.addOrderBy('review.id', sortOrder);
    }

    if (decodedId) {
      const sortField = `review.${sortBy}`;
      if (direction === 'forward') {
        // Move forward (next page): fetch rows after the cursor, exclude the cursor row itself
        queryBuilder.andWhere('review.id != :cursorId', { cursorId: decodedId });

        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND review.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND review.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('review.id > :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('review.id < :cursorId', { cursorId: decodedId });
          }
        }
      } else {
        // Move backward (previous page): fetch rows before the cursor using reversed sort
        if (decodedSortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND review.id < :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND review.id > :cursorId))`,
              { sortValue: decodedSortValue, cursorId: decodedId },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('review.id < :cursorId', { cursorId: decodedId });
          } else {
            queryBuilder.andWhere('review.id > :cursorId', { cursorId: decodedId });
          }
        }

        // For backward pagination, reverse the sorting so we can later flip the page items
        if (sortOrder === 'DESC') {
          queryBuilder
            .orderBy(`review.${sortBy}`, 'ASC')
            .addOrderBy('review.id', 'ASC');
        } else {
          queryBuilder
            .orderBy(`review.${sortBy}`, 'DESC')
            .addOrderBy('review.id', 'DESC');
        }
      }
    }

    queryBuilder.take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    // Create a map of review.id -> raw data to handle cases where joins create multiple rows per review
    const rawDataMap = new Map<string, Record<string, unknown>>();
    raw.forEach((rawRow: Record<string, unknown>) => {
      const reviewId =
        (rawRow.review_id as string) ||
        (rawRow.reviewId as string) ||
        (rawRow['review_id'] as string) ||
        (rawRow['reviewId'] as string);
      if (reviewId && !rawDataMap.has(reviewId)) {
        rawDataMap.set(reviewId, rawRow);
      }
    });

    data.forEach((review) => {
      const rawData = rawDataMap.get(review.id);
      if (rawData) {
        (review as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (review as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
      } else {
        (review as any).likeCount = 0;
        (review as any).dislikeCount = 0;
      }
    });

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1] as unknown as Record<string, unknown>;
        const fieldValue = lastItem[sortBy];
        const sortValue =
          fieldValue !== null && fieldValue !== undefined ? (fieldValue as string | number | Date) : null;
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id as string, sortValue ?? undefined, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      if (decodedId && cursor) {
        previousCursor = CursorPaginationUtil.encodeCursor(
          decodedId,
          decodedSortValue,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    } else {
      // Backward pagination: entities are in reversed order; normalize back to requested sort order
      const pageItems = data;
      data = pageItems.slice().reverse();

      if (data.length > 0) {
        const oldestInPage = data[data.length - 1] as unknown as Record<string, unknown>;
        const oldestFieldValue = oldestInPage[sortBy];
        const oldestSortValue =
          oldestFieldValue !== null && oldestFieldValue !== undefined
            ? (oldestFieldValue as string | number | Date)
            : null;
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id as string,
          oldestSortValue ?? undefined,
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }

      if (hasMore && data.length > 0) {
        const newestInPage = data[0] as unknown as Record<string, unknown>;
        const newestFieldValue = newestInPage[sortBy];
        const newestSortValue =
          newestFieldValue !== null && newestFieldValue !== undefined
            ? (newestFieldValue as string | number | Date)
            : null;
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id as string,
          newestSortValue ?? undefined,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    }

    return {
      data,
      nextCursor,
      previousCursor: previousCursor ?? null,
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
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('review.site', 'site')
      .leftJoinAndSelect('review.images', 'images')
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
      if (isUuid(filters.siteId)) {
        // Filter by site UUID
        queryBuilder.andWhere('review.siteId = :siteId', {
          siteId: filters.siteId,
        });
      } else {
        // Filter by site slug
        queryBuilder.andWhere('site.slug = :siteSlug', {
          siteSlug: filters.siteId,
        });
      }
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

    // Create a map of review.id -> raw data to handle cases where joins create multiple rows per review
    const rawDataMap = new Map<string, Record<string, unknown>>();
    raw.forEach((rawRow: Record<string, unknown>) => {
      const reviewId =
        (rawRow.review_id as string) ||
        (rawRow.reviewId as string) ||
        (rawRow['review_id'] as string) ||
        (rawRow['reviewId'] as string);
      if (reviewId && !rawDataMap.has(reviewId)) {
        rawDataMap.set(reviewId, rawRow);
      }
    });

    data.forEach((review) => {
      const rawData = rawDataMap.get(review.id);
      if (rawData) {
        (review as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (review as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
      } else {
        (review as any).likeCount = 0;
        (review as any).dislikeCount = 0;
      }
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
    };
  }

  async findByUserId(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteReview>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({ userId });
    const sortDefinition = 'createdAt:DESC,id:DESC';

    let decodedId: string | undefined;
    let decodedSortCreatedAt: Date | undefined;
    let direction: 'forward' | 'backward' = 'forward';

    if (cursor) {
      try {
        const {
          id,
          sortValue,
          direction: decodedDirection,
          filterKey: cursorFilterKey,
        } = CursorPaginationUtil.decodeCursor(cursor);
        if (cursorFilterKey && cursorFilterKey !== filterKey) {
          decodedId = undefined;
          decodedSortCreatedAt = undefined;
        } else {
          decodedId = id;
          if (sortValue) decodedSortCreatedAt = new Date(sortValue);
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const queryBuilder = this.repository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.site', 'site')
      .leftJoinAndSelect('review.images', 'images')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
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

    if (!decodedId || direction === 'forward') {
      queryBuilder
        .orderBy('review.createdAt', 'DESC')
        .addOrderBy('review.id', 'DESC');
    }

    if (decodedId) {
      if (direction === 'forward') {
        queryBuilder.andWhere('review.id != :cursorId', { cursorId: decodedId });
        if (decodedSortCreatedAt) {
          queryBuilder.andWhere(
            '(review.createdAt < :sortCreatedAt OR (review.createdAt = :sortCreatedAt AND review.id < :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('review.id < :cursorId', { cursorId: decodedId });
        }
      } else {
        if (decodedSortCreatedAt) {
          queryBuilder.andWhere(
            '(review.createdAt > :sortCreatedAt OR (review.createdAt = :sortCreatedAt AND review.id > :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('review.id > :cursorId', { cursorId: decodedId });
        }
        queryBuilder
          .orderBy('review.createdAt', 'ASC')
          .addOrderBy('review.id', 'ASC');
      }
    }

    queryBuilder.take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    let data = entities.slice(0, realLimit);

    const rawDataMap = new Map<string, Record<string, unknown>>();
    raw.forEach((rawRow: Record<string, unknown>) => {
      const reviewId =
        (rawRow.review_id as string) ||
        (rawRow.reviewId as string) ||
        (rawRow['review_id'] as string) ||
        (rawRow['reviewId'] as string);
      if (reviewId && !rawDataMap.has(reviewId)) {
        rawDataMap.set(reviewId, rawRow);
      }
    });

    data.forEach((review) => {
      const rawData = rawDataMap.get(review.id);
      if (rawData) {
        (review as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (review as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
      } else {
        (review as any).likeCount = 0;
        (review as any).dislikeCount = 0;
      }
    });

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (decodedId && cursor) {
        previousCursor = CursorPaginationUtil.encodeCursor(decodedId, decodedSortCreatedAt, {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      data = data.slice().reverse();
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(oldestInPage.id, oldestInPage.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          newestInPage.createdAt,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    }

    return {
      data,
      nextCursor,
      previousCursor: previousCursor ?? null,
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
      throw notFound(MessageKeys.SITE_REVIEW_NOT_FOUND_AFTER_UPDATE);
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

  async getStatistics(siteId: string): Promise<{
    averageRating: number;
    averageOdds: number;
    averageLimit: number;
    averageEvent: number;
    averageSpeed: number;
    reviewCount: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('review')
      .select('COUNT(review.id)', 'count')
      .addSelect('AVG(review.rating)', 'avgRating')
      .addSelect('AVG(review.odds)', 'avgOdds')
      .addSelect('AVG(review.limit)', 'avgLimit')
      .addSelect('AVG(review.event)', 'avgEvent')
      .addSelect('AVG(review.speed)', 'avgSpeed')
      .where('review.siteId = :siteId', { siteId })
      .andWhere('review.isPublished = :isPublished', { isPublished: true })
      .andWhere('review.deletedAt IS NULL')
      .getRawOne();

    const parseAvg = (value: string | null | undefined): number => {
      if (!value) return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
    };

    return {
      averageRating: parseAvg(result?.avgRating),
      averageOdds: parseAvg(result?.avgOdds),
      averageLimit: parseAvg(result?.avgLimit),
      averageEvent: parseAvg(result?.avgEvent),
      averageSpeed: parseAvg(result?.avgSpeed),
      reviewCount: parseInt(result?.count || '0', 10),
    };
  }

  async findTopStarReviews(siteId: string): Promise<string[]> {
    const reviews = await this.repository.find({
      where: {
        siteId,
        rating: MoreThanOrEqual(4),
        isPublished: true,
        deletedAt: null,
      },
      select: ['content'],
      order: {
        rating: 'DESC',
        createdAt: 'DESC',
      },
      take: 5,
    });

    return reviews.map((review) => review.content);
  }
}
