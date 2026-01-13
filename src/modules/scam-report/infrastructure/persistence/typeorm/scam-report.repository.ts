import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ScamReport,
  ScamReportStatus,
} from '../../../domain/entities/scam-report.entity';
import { IScamReportRepository } from '../repositories/scam-report.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { isUuid } from '../../../../../shared/utils/uuid.util';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class ScamReportRepository implements IScamReportRepository {
  constructor(
    @InjectRepository(ScamReport)
    private readonly repository: Repository<ScamReport>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<ScamReport | null> {
    const needsReactionCount = relations?.includes('reactions');

    if (needsReactionCount) {
      const queryBuilder = this.repository
        .createQueryBuilder('report')
        .where('report.id = :id', { id })
        .andWhere('report.deletedAt IS NULL');

      // Add relations
      if (relations?.includes('images')) {
        queryBuilder.leftJoinAndSelect(
          'report.images',
          'images',
          'images.deletedAt IS NULL',
        );
      }
      if (relations?.includes('user')) {
        queryBuilder.leftJoinAndSelect('report.user', 'user');
      }
      if (relations?.includes('site')) {
        queryBuilder.leftJoinAndSelect('report.site', 'site');
      }
      if (relations?.includes('admin')) {
        queryBuilder.leftJoinAndSelect('report.admin', 'admin');
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

      // Add reaction counts
      queryBuilder.addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      );
      queryBuilder.addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      );

      const result = await queryBuilder.getRawAndEntities();
      if (result.entities.length === 0) {
        return null;
      }

      const report = result.entities[0];
      const rawData = result.raw[0];
      (report as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
      (report as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);

      return report;
    }

    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findBySiteId(
    siteId: string,
    status?: ScamReportStatus,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<ScamReport>> {
    const realLimit = limit > 50 ? 50 : limit;
    const queryBuilder = this.repository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('report.site', 'site')
      .leftJoinAndSelect('report.images', 'images', 'images.deletedAt IS NULL')
      .leftJoinAndSelect('report.admin', 'admin')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .where('report.siteId = :siteId', { siteId })
      .andWhere('report.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    // Apply cursor pagination
    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue) {
          const sortDate = new Date(sortValue);
          queryBuilder.andWhere(
            '(report.createdAt < :sortDate OR (report.createdAt = :sortDate AND report.id < :cursorId))',
            { sortDate, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('report.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('report.createdAt', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    // Create a map of report.id -> raw data to handle cases where joins create multiple rows per report
    const rawDataMap = new Map<string, Record<string, unknown>>();
    raw.forEach((rawRow: Record<string, unknown>) => {
      const reportId =
        (rawRow.report_id as string) ||
        (rawRow.reportId as string) ||
        (rawRow.scam_report_id as string) ||
        (rawRow.scamReportId as string) ||
        (rawRow['report_id'] as string) ||
        (rawRow['reportId'] as string);
      if (reportId && !rawDataMap.has(reportId)) {
        rawDataMap.set(reportId, rawRow);
      }
    });

    // Map reaction counts from raw data to entities
    data.forEach((report) => {
      const rawData = rawDataMap.get(report.id);
      if (rawData) {
        (report as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (report as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
      } else {
        (report as any).likeCount = 0;
        (report as any).dislikeCount = 0;
      }
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

  async findByUserId(
    userId: string,
    status?: ScamReportStatus,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<ScamReport>> {
    const realLimit = limit > 50 ? 50 : limit;
    const queryBuilder = this.repository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.site', 'site')
      .leftJoinAndSelect('report.images', 'images', 'images.deletedAt IS NULL')
      .leftJoinAndSelect('report.admin', 'admin')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .where('report.userId = :userId', { userId })
      .andWhere('report.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    // Apply cursor pagination
    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue) {
          const sortDate = new Date(sortValue);
          queryBuilder.andWhere(
            '(report.createdAt < :sortDate OR (report.createdAt = :sortDate AND report.id < :cursorId))',
            { sortDate, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('report.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('report.createdAt', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    // Create a map of report.id -> raw data to handle cases where joins create multiple rows per report
    const rawDataMap = new Map<string, Record<string, unknown>>();
    raw.forEach((rawRow: Record<string, unknown>) => {
      const reportId =
        (rawRow.report_id as string) ||
        (rawRow.reportId as string) ||
        (rawRow.scam_report_id as string) ||
        (rawRow.scamReportId as string) ||
        (rawRow['report_id'] as string) ||
        (rawRow['reportId'] as string);
      if (reportId && !rawDataMap.has(reportId)) {
        rawDataMap.set(reportId, rawRow);
      }
    });

    // Map reaction counts from raw data to entities
    data.forEach((report) => {
      const rawData = rawDataMap.get(report.id);
      if (rawData) {
        (report as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (report as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
      } else {
        (report as any).likeCount = 0;
        (report as any).dislikeCount = 0;
      }
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

  async findAll(
    status?: ScamReportStatus,
    siteId?: string,
    siteName?: string,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<ScamReport>> {
    const realLimit = limit > 50 ? 50 : limit;
    const queryBuilder = this.repository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('report.site', 'site')
      .leftJoinAndSelect('report.admin', 'admin')
      .leftJoinAndSelect('report.images', 'images', 'images.deletedAt IS NULL')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('scam_report_reactions', 'reaction')
            .where('reaction.scam_report_id = report.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .where('report.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    // Filter by siteId (UUID or slug)
    if (siteId) {
      if (isUuid(siteId)) {
        // Filter by site UUID
        queryBuilder.andWhere('report.siteId = :siteId', { siteId });
      } else {
        // Filter by site slug
        queryBuilder.andWhere('site.slug = :siteSlug', { siteSlug: siteId });
      }
    }

    // Filter by siteName (LIKE search - for backward compatibility)
    if (siteName) {
      queryBuilder.andWhere('LOWER(site.name) LIKE LOWER(:siteName)', {
        siteName: `%${siteName}%`,
      });
    }

    // Apply cursor pagination
    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue) {
          const sortDate = new Date(sortValue);
          queryBuilder.andWhere(
            '(report.createdAt < :sortDate OR (report.createdAt = :sortDate AND report.id < :cursorId))',
            { sortDate, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('report.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('report.createdAt', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .take(realLimit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    // Create a map of report.id -> raw data to handle cases where joins create multiple rows per report
    const rawDataMap = new Map<string, Record<string, unknown>>();
    raw.forEach((rawRow: Record<string, unknown>) => {
      const reportId =
        (rawRow.report_id as string) ||
        (rawRow.reportId as string) ||
        (rawRow.scam_report_id as string) ||
        (rawRow.scamReportId as string) ||
        (rawRow['report_id'] as string) ||
        (rawRow['reportId'] as string);
      if (reportId && !rawDataMap.has(reportId)) {
        rawDataMap.set(reportId, rawRow);
      }
    });

    // Map reaction counts from raw data to entities
    data.forEach((report) => {
      const rawData = rawDataMap.get(report.id);
      if (rawData) {
        (report as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (report as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
      } else {
        (report as any).likeCount = 0;
        (report as any).dislikeCount = 0;
      }
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

  async countBySiteId(siteId: string, status?: ScamReportStatus): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder('report')
      .where('report.siteId = :siteId', { siteId })
      .andWhere('report.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    return queryBuilder.getCount();
  }

  async create(report: Partial<ScamReport>): Promise<ScamReport> {
    const entity = this.repository.create(report);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<ScamReport>): Promise<ScamReport> {
    await this.repository.update(id, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw notFound(MessageKeys.SCAM_REPORT_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
