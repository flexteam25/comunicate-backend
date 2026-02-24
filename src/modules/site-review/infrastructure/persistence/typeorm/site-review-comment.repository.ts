import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteReviewComment } from '../../../domain/entities/site-review-comment.entity';
import { ISiteReviewCommentRepository } from '../repositories/site-review-comment.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class SiteReviewCommentRepository implements ISiteReviewCommentRepository {
  constructor(
    @InjectRepository(SiteReviewComment)
    private readonly repository: Repository<SiteReviewComment>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<SiteReviewComment | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findByReviewId(
    reviewId: string,
    parentCommentId?: string | null,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<SiteReviewComment>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      reviewId,
      parentCommentId: parentCommentId ?? null,
    });
    const sortDefinition = 'createdAt:ASC,id:ASC';

    let decodedId: string | undefined;
    let decodedSortCreatedAt: Date | undefined;
    let decodedSortValueRaw: string | undefined;
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
          decodedSortValueRaw = undefined;
        } else {
          decodedId = id;
          if (sortValue) {
            decodedSortCreatedAt = new Date(sortValue);
            decodedSortValueRaw = sortValue;
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const queryBuilder = this.repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('comment.images', 'images')
      .where('comment.siteReviewId = :reviewId', { reviewId })
      .andWhere('comment.deletedAt IS NULL');

    if (parentCommentId === undefined || parentCommentId === null) {
      queryBuilder.andWhere('comment.parentCommentId IS NULL');
    } else {
      queryBuilder.andWhere('comment.parentCommentId = :parentCommentId', {
        parentCommentId,
      });
    }

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy('comment.createdAt', 'ASC').addOrderBy('comment.id', 'ASC');
    }

    if (decodedId) {
      if (direction === 'forward') {
        queryBuilder.andWhere('comment.id != :cursorId', { cursorId: decodedId });
        if (decodedSortCreatedAt) {
          queryBuilder.andWhere(
            '(comment.createdAt > :sortCreatedAt OR (comment.createdAt = :sortCreatedAt AND comment.id > :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('comment.id > :cursorId', { cursorId: decodedId });
        }
      } else {
        // Backward: previous page = items at or before boundary. Use <= and (createdAt < X OR id <= Y)
        // to avoid timestamp equality precision issues; pass ISO string so DB casts consistently.
        if (decodedSortValueRaw) {
          queryBuilder.andWhere(
            `comment.createdAt <= :sortCreatedAtRaw AND (comment.createdAt < :sortCreatedAtRaw OR comment.id <= :cursorId)`,
            { sortCreatedAtRaw: decodedSortValueRaw, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('comment.id <= :cursorId', { cursorId: decodedId });
        }
        queryBuilder
          .orderBy('comment.createdAt', 'DESC')
          .addOrderBy('comment.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

    let rows = await queryBuilder.getMany();
    let data = rows.slice(0, realLimit);

    // If backward returned 0 rows (e.g. timestamp/type mismatch), return first page instead
    if (decodedId && direction === 'backward' && data.length === 0) {
      const fallbackQb = this.repository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .leftJoinAndSelect('user.userBadges', 'userBadges')
        .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
        .leftJoinAndSelect('comment.images', 'images')
        .where('comment.siteReviewId = :reviewId', { reviewId })
        .andWhere('comment.deletedAt IS NULL');
      if (parentCommentId === undefined || parentCommentId === null) {
        fallbackQb.andWhere('comment.parentCommentId IS NULL');
      } else {
        fallbackQb.andWhere('comment.parentCommentId = :parentCommentId', { parentCommentId });
      }
      fallbackQb
        .orderBy('comment.createdAt', 'ASC')
        .addOrderBy('comment.id', 'ASC')
        .take(realLimit + 1);
      rows = await fallbackQb.getMany();
      data = rows.slice(0, realLimit);
      // Treat as first page for cursor building
      direction = 'forward';
      decodedId = undefined;
    }

    const hasMoreFinal = rows.length > realLimit;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMoreFinal && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (decodedId && cursor) {
        prevCursor = CursorPaginationUtil.encodeCursor(decodedId, decodedSortCreatedAt, {
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
      if (hasMoreFinal && data.length > 0) {
        const newestInPage = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
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
      prevCursor: prevCursor ?? null,
    };
  }

  async create(comment: Partial<SiteReviewComment>): Promise<SiteReviewComment> {
    const entity = this.repository.create(comment);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<SiteReviewComment>): Promise<SiteReviewComment> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw notFound(MessageKeys.SITE_REVIEW_COMMENT_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
