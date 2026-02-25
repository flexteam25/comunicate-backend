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
    // Always load commentCount for user APIs
    const needsCommentCount = true;

    if (needsReactionCount || needsCommentCount) {
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
      // Add comment count (excluding soft deleted comments)
      queryBuilder.addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(comment.id)', 'commentCount')
            .from('scam_report_comments', 'comment')
            .where('comment.scam_report_id = report.id')
            .andWhere('comment.deletedAt IS NULL'),
        'commentCount',
      );

      const result = await queryBuilder.getRawAndEntities();
      if (result.entities.length === 0) {
        return null;
      }

      const report = result.entities[0];
      const rawData = result.raw[0];
      (report as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
      (report as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
      (report as any).commentCount = parseInt(rawData?.commentCount || '0', 10);

      return report;
    }

    // Always use query builder to load commentCount
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

    // Add comment count (excluding soft deleted comments)
    queryBuilder.addSelect(
      (subQuery) =>
        subQuery
          .select('COUNT(comment.id)', 'commentCount')
          .from('scam_report_comments', 'comment')
          .where('comment.scam_report_id = report.id')
          .andWhere('comment.deletedAt IS NULL'),
      'commentCount',
    );

    const result = await queryBuilder.getRawAndEntities();
    if (result.entities.length === 0) {
      return null;
    }

    const report = result.entities[0];
    const rawData = result.raw[0];
    (report as any).commentCount = parseInt(rawData?.commentCount || '0', 10);

    return report;
  }

  async findBySiteId(
    siteId: string,
    status?: ScamReportStatus,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<ScamReport>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      siteId,
      status: status ?? null,
    });

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
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(comment.id)', 'commentCount')
            .from('scam_report_comments', 'comment')
            .where('comment.scam_report_id = report.id')
            .andWhere('comment.deletedAt IS NULL'),
        'commentCount',
      )
      .where('report.siteId = :siteId', { siteId })
      .andWhere('report.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
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

    const sortDefinition = 'createdAt:DESC,id:DESC';

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC');
    }

    if (decodedId) {
      queryBuilder.andWhere('report.id != :cursorId', { cursorId: decodedId });
      if (decodedSortCreatedAt) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            '(report.createdAt < :sortCreatedAt OR (report.createdAt = :sortCreatedAt AND report.id < :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            '(report.createdAt > :sortCreatedAt OR (report.createdAt = :sortCreatedAt AND report.id > :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('report.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('report.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

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

    // Map reaction counts and comment count from raw data to entities
    data.forEach((report) => {
      const rawData = rawDataMap.get(report.id);
      if (rawData) {
        (report as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (report as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
        (report as any).commentCount = parseInt(String(rawData.commentCount || '0'), 10);
      } else {
        (report as any).likeCount = 0;
        (report as any).dislikeCount = 0;
        (report as any).commentCount = 0;
      }
    });

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          firstItem.id,
          firstItem.createdAt,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    } else {
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

  async findByUserId(
    userId: string,
    status?: ScamReportStatus,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<ScamReport>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      userId,
      status: status ?? null,
    });

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
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(comment.id)', 'commentCount')
            .from('scam_report_comments', 'comment')
            .where('comment.scam_report_id = report.id')
            .andWhere('comment.deletedAt IS NULL'),
        'commentCount',
      )
      .where('report.userId = :userId', { userId })
      .andWhere('report.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
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

    const sortDefinition = 'createdAt:DESC,id:DESC';

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC');
    }

    if (decodedId) {
      queryBuilder.andWhere('report.id != :cursorId', { cursorId: decodedId });
      if (decodedSortCreatedAt) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            '(report.createdAt < :sortCreatedAt OR (report.createdAt = :sortCreatedAt AND report.id < :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            '(report.createdAt > :sortCreatedAt OR (report.createdAt = :sortCreatedAt AND report.id > :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('report.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('report.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

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

    // Map reaction counts and comment count from raw data to entities
    data.forEach((report) => {
      const rawData = rawDataMap.get(report.id);
      if (rawData) {
        (report as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (report as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
        (report as any).commentCount = parseInt(String(rawData.commentCount || '0'), 10);
      } else {
        (report as any).likeCount = 0;
        (report as any).dislikeCount = 0;
        (report as any).commentCount = 0;
      }
    });

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          firstItem.id,
          firstItem.createdAt,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    } else {
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

  async findAll(
    status?: ScamReportStatus,
    siteId?: string,
    siteName?: string,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<ScamReport>> {
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      status: status ?? null,
      siteId: siteId ?? null,
      siteName: siteName ?? null,
    });

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
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(comment.id)', 'commentCount')
            .from('scam_report_comments', 'comment')
            .where('comment.scam_report_id = report.id')
            .andWhere('comment.deletedAt IS NULL'),
        'commentCount',
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

    // Filter by siteName - search site.name, site.permanent_url and report.site_url
    if (siteName) {
      queryBuilder.andWhere(
        '(' +
          'LOWER(site.name) LIKE LOWER(:siteName) ' +
          'OR LOWER(site.permanent_url) LIKE LOWER(:siteName) ' +
          'OR LOWER(report.site_url) LIKE LOWER(:siteName)' +
          ')',
        {
          siteName: `%${siteName}%`,
        },
      );
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

    const sortDefinition = 'createdAt:DESC,id:DESC';

    if (!decodedId || direction === 'forward') {
      queryBuilder.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC');
    }

    if (decodedId) {
      queryBuilder.andWhere('report.id != :cursorId', { cursorId: decodedId });
      if (decodedSortCreatedAt) {
        if (direction === 'forward') {
          queryBuilder.andWhere(
            '(report.createdAt < :sortCreatedAt OR (report.createdAt = :sortCreatedAt AND report.id < :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        } else {
          queryBuilder.andWhere(
            '(report.createdAt > :sortCreatedAt OR (report.createdAt = :sortCreatedAt AND report.id > :cursorId))',
            { sortCreatedAt: decodedSortCreatedAt, cursorId: decodedId },
          );
        }
      } else {
        if (direction === 'forward') {
          queryBuilder.andWhere('report.id < :cursorId', { cursorId: decodedId });
        } else {
          queryBuilder.andWhere('report.id > :cursorId', { cursorId: decodedId });
        }
      }
      if (direction === 'backward') {
        queryBuilder.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC');
      }
    }

    queryBuilder.take(realLimit + 1);

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

    // Map reaction counts and comment count from raw data to entities
    data.forEach((report) => {
      const rawData = rawDataMap.get(report.id);
      if (rawData) {
        (report as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
        (report as any).dislikeCount = parseInt(String(rawData.dislikeCount || '0'), 10);
        (report as any).commentCount = parseInt(String(rawData.commentCount || '0'), 10);
      } else {
        (report as any).likeCount = 0;
        (report as any).dislikeCount = 0;
        (report as any).commentCount = 0;
      }
    });

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt, {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }

      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          firstItem.id,
          firstItem.createdAt,
          {
            direction: 'backward',
            sort: sortDefinition,
            filterKey,
          },
        );
      }
    } else {
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
