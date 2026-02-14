import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScamReportComment } from '../../../domain/entities/scam-report-comment.entity';
import { IScamReportCommentRepository } from '../repositories/scam-report-comment.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class ScamReportCommentRepository implements IScamReportCommentRepository {
  constructor(
    @InjectRepository(ScamReportComment)
    private readonly repository: Repository<ScamReportComment>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<ScamReportComment | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findByReportId(
    reportId: string,
    parentCommentId?: string | null,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<ScamReportComment>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      reportId,
      parentCommentId: parentCommentId ?? null,
    });

    const queryBuilder = this.repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.images', 'images')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .where('comment.scamReportId = :reportId', { reportId })
      .andWhere('comment.deletedAt IS NULL');

    // Filter by parentCommentId: if not provided, only get top-level comments (parentCommentId IS NULL)
    if (parentCommentId === undefined) {
      queryBuilder.andWhere('comment.parentCommentId IS NULL');
    } else if (parentCommentId !== null) {
      queryBuilder.andWhere('comment.parentCommentId = :parentCommentId', {
        parentCommentId,
      });
    }

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
          if (sortValue) {
            decodedSortCreatedAt = new Date(sortValue);
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const sortDefinition = 'createdAt:ASC,id:ASC';

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy('comment.createdAt', 'ASC').addOrderBy('comment.id', 'ASC');
    }

    if (decodedId) {
      if (direction === 'forward') {
        // When moving forward (next page), exclude the cursor row to avoid duplicates across pages
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
        // When moving backward (previous page), keep the full previous window (do not exclude cursorId)
        if (decodedSortCreatedAt) {
          queryBuilder.andWhere(
            '(comment.createdAt < :sortCreatedAt OR (comment.createdAt = :sortCreatedAt AND comment.id < :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere('comment.id < :cursorId', { cursorId: decodedId });
        }

        queryBuilder
          .orderBy('comment.createdAt', 'DESC')
          .addOrderBy('comment.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    let data: ScamReportComment[];
    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      data = rows.slice(0, realLimit);

      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      // When we have a cursor (we are not on the first page), build prevCursor from
      // the first item in the current page. This allows navigating back to the
      // previous window without losing boundary items.
      if (decodedId && data.length > 0 && cursor) {
        const firstItemInPage = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
          firstItemInPage.id,
          firstItemInPage.createdAt,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    } else {
      const pageItemsDesc = rows.slice(0, realLimit);
      data = pageItemsDesc.reverse();

      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id,
          oldestInPage.createdAt,
          {
            direction: 'forward',
            sort: sortDefinition,
            filterKey,
          },
        );
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

  async create(comment: Partial<ScamReportComment>): Promise<ScamReportComment> {
    const entity = this.repository.create(comment);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<ScamReportComment>): Promise<ScamReportComment> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw notFound(MessageKeys.COMMENT_NOT_FOUND);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
