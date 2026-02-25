import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScamReportComment } from '../../../domain/entities/scam-report-comment.entity';
import { IScamReportCommentRepository } from '../repositories/scam-report-comment.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.images', 'images')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .where('comment.scamReportId = :reportId', { reportId })
      .andWhere('comment.deletedAt IS NULL');

    if (parentCommentId === undefined) {
      queryBuilder.andWhere('comment.parentCommentId IS NULL');
    } else if (parentCommentId !== null) {
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
