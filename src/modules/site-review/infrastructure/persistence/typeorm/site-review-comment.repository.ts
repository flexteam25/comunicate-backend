import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteReviewComment } from '../../../domain/entities/site-review-comment.entity';
import { ISiteReviewCommentRepository } from '../repositories/site-review-comment.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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

    queryBuilder
      .orderBy('comment.createdAt', 'ASC')
      .addOrderBy('comment.id', 'ASC')
      .skip(offset)
      .take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

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
