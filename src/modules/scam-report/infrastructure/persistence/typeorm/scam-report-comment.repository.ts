import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScamReportComment } from '../../../domain/entities/scam-report-comment.entity';
import { IScamReportCommentRepository } from '../repositories/scam-report-comment.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

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

    // Apply cursor pagination
    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue) {
          const sortDate = new Date(sortValue);
          queryBuilder.andWhere(
            '(comment.createdAt > :sortDate OR (comment.createdAt = :sortDate AND comment.id > :cursorId))',
            { sortDate, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('comment.id > :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('comment.createdAt', 'ASC')
      .addOrderBy('comment.id', 'ASC')
      .take(realLimit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > realLimit;
    const data = rows.slice(0, realLimit);

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

  async create(comment: Partial<ScamReportComment>): Promise<ScamReportComment> {
    const entity = this.repository.create(comment);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<ScamReportComment>): Promise<ScamReportComment> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Comment not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
