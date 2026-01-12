import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../repositories/post.repository';
import { IPostCategoryRepository } from '../repositories/post-category.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class PostRepository implements IPostRepository {
  constructor(
    @InjectRepository(Post)
    private readonly repository: Repository<Post>,
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Post | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      relations,
    });
  }

  async findByIdWithAggregates(id: string, userId?: string): Promise<Post | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('post.admin', 'admin')
      .leftJoinAndSelect('post.category', 'category')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('post_reactions', 'reaction')
            .where('reaction.post_id = post.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('post_reactions', 'reaction')
            .where('reaction.post_id = post.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM post_comments WHERE post_id = post.id AND deleted_at IS NULL)`,
        'commentCount',
      )
      .addSelect(
        `(SELECT COUNT(DISTINCT user_id) FROM post_views WHERE post_id = post.id AND user_id IS NOT NULL)`,
        'viewCount',
      )
      .where('post.deletedAt IS NULL')
      .andWhere('post.id = :id', { id });

    // Join user's reaction if userId is provided
    if (userId) {
      queryBuilder
        .leftJoin(
          'post_reactions',
          'userReaction',
          'userReaction.post_id = post.id AND userReaction.user_id = :userId',
          { userId },
        )
        .addSelect('userReaction.reaction_type', 'userReactionType');
    }

    const result = await queryBuilder.getRawAndEntities();
    if (result.entities.length === 0) {
      return null;
    }

    const post = result.entities[0];
    const rawData = result.raw[0];
    (post as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
    (post as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
    (post as any).commentCount = parseInt(rawData?.commentCount || '0', 10);
    (post as any).viewCount = parseInt(rawData?.viewCount || '0', 10);

    // Map user reaction if userId is provided
    if (userId) {
      // PostgreSQL may return column names in lowercase when using getRawAndEntities
      const userReactionType = (rawData?.userReactionType ||
        rawData?.userreactiontype ||
        rawData?.['userReactionType'] ||
        rawData?.['userreactiontype']) as string | null;
      (post as any).reacted = userReactionType || null;
    }

    return post;
  }

  async findByTitle(title: string, excludePostId?: string): Promise<Post | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('post')
      .where('post.deletedAt IS NULL')
      .andWhere('LOWER(post.title) = LOWER(:title)', { title });

    if (excludePostId) {
      queryBuilder.andWhere('post.id != :excludePostId', { excludePostId });
    }

    return queryBuilder.getOne();
  }

  async findAllAdmin(
    filters?: {
      isPublished?: boolean;
      categoryId?: string;
      userId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<Post>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('post.admin', 'admin')
      .leftJoinAndSelect('post.category', 'category')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('post_reactions', 'reaction')
            .where('reaction.post_id = post.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('post_reactions', 'reaction')
            .where('reaction.post_id = post.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM post_comments WHERE post_id = post.id AND deleted_at IS NULL)`,
        'commentCount',
      )
      .addSelect(
        `(SELECT COUNT(DISTINCT user_id) FROM post_views WHERE post_id = post.id AND user_id IS NOT NULL)`,
        'viewCount',
      )
      .where('post.deletedAt IS NULL');

    if (filters?.isPublished !== undefined) {
      queryBuilder.andWhere('post.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    if (filters?.categoryId) {
      // Check if category has specialKey
      const category = await this.categoryRepository.findById(filters.categoryId);
      if (category && category.specialKey === 'popular') {
        // Special query: posts with likeCount > 5
        queryBuilder.andWhere(
          `(SELECT COUNT(*) FROM post_reactions WHERE post_id = post.id AND reaction_type = 'like') > 5`,
        );
      } else {
        // Normal query: filter by categoryId
        queryBuilder.andWhere('post.categoryId = :categoryId', {
          categoryId: filters.categoryId,
        });
      }
    }

    if (filters?.userId) {
      queryBuilder.andWhere('post.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(LOWER(post.title) LIKE LOWER(:search) OR LOWER(user.displayName) LIKE LOWER(:search))',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = `post.${sortBy}`;
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortField} > :sortValue OR (${sortField} = :sortValue AND post.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortField} < :sortValue OR (${sortField} = :sortValue AND post.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('post.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('post.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    if (sortOrder === 'DESC') {
      queryBuilder.addOrderBy(`post.${sortBy}`, 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy(`post.${sortBy}`, 'ASC');
    }
    queryBuilder.addOrderBy('post.id', sortOrder);
    queryBuilder.take(realLimit + 1);

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    const data = result.entities.slice(0, realLimit);

    // Create a map of post.id -> raw data to handle cases where subqueries might create multiple rows
    const rawDataMap = new Map<string, any>();
    result.raw.forEach((raw) => {
      const postId = raw.post_id || raw.postId || raw.post_id;
      if (postId && !rawDataMap.has(postId)) {
        rawDataMap.set(postId, raw);
      }
    });

    // Map likeCount, dislikeCount, commentCount, viewCount from raw data to entities
    data.forEach((post) => {
      const rawData = rawDataMap.get(post.id);
      if (rawData) {
        (post as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
        (post as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
        (post as any).commentCount = parseInt(rawData?.commentCount || '0', 10);
        (post as any).viewCount = parseInt(rawData?.viewCount || '0', 10);
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

    return { data, nextCursor, hasMore };
  }

  async findPublished(
    filters?: {
      categoryId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      userId?: string; // Optional userId to get user's reaction
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<Post>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = filters?.sortBy || 'publishedAt';
    const sortOrder = filters?.sortOrder || 'DESC';

    // Check if sortBy is a computed field (from subquery)
    const computedFields = ['likeCount', 'dislikeCount', 'commentCount'];
    const isComputedField = computedFields.includes(sortBy);

    const queryBuilder = this.repository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('post.admin', 'admin')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoin(
        'post_reactions',
        'likeReaction',
        "likeReaction.post_id = post.id AND likeReaction.reaction_type = 'like'",
      )
      .leftJoin(
        'post_reactions',
        'dislikeReaction',
        "dislikeReaction.post_id = post.id AND dislikeReaction.reaction_type = 'dislike'",
      );

    // Join user's reaction if userId is provided
    if (filters?.userId) {
      queryBuilder.leftJoin(
        'post_reactions',
        'userReaction',
        'userReaction.post_id = post.id AND userReaction.user_id = :userId',
        { userId: filters.userId },
      );
      queryBuilder.addSelect('userReaction.reaction_type', 'userReactionType');
    }

    queryBuilder
      .addSelect('COUNT(DISTINCT likeReaction.id)', 'likeCount')
      .addSelect('COUNT(DISTINCT dislikeReaction.id)', 'dislikeCount')
      .addSelect(
        `(SELECT COUNT(*) FROM post_comments WHERE post_id = post.id AND deleted_at IS NULL)`,
        'commentCount',
      )
      .addSelect(`(SELECT COUNT(*) FROM post_views WHERE post_id = post.id)`, 'viewCount')
      .groupBy('post.id')
      .addGroupBy('user.id')
      .addGroupBy('userBadges.id')
      .addGroupBy('badge.id')
      .addGroupBy('admin.id')
      .addGroupBy('category.id')
      .where('post.deletedAt IS NULL')
      .andWhere('post.isPublished = :isPublished', { isPublished: true });

    // Add userReactionType to GROUP BY if userId is provided
    if (filters?.userId) {
      queryBuilder.addGroupBy('userReaction.reaction_type');
    }

    if (filters?.categoryId) {
      // Check if category has specialKey
      const category = await this.categoryRepository.findById(filters.categoryId);
      if (category && category.specialKey === 'popular') {
        // Special query: posts with likeCount > 5
        // Note: likeCount is already computed in the query above
        queryBuilder.having('COUNT(DISTINCT likeReaction.id) > 5');
      } else {
        // Normal query: filter by categoryId
        queryBuilder.andWhere('post.categoryId = :categoryId', {
          categoryId: filters.categoryId,
        });
      }
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(LOWER(post.title) LIKE LOWER(:search) OR LOWER(user.displayName) LIKE LOWER(:search))',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    // Build sort field expression for WHERE clause (for cursor pagination)
    let sortFieldForWhere: string;
    if (isComputedField) {
      // For computed fields from GROUP BY, use the COUNT expressions
      if (sortBy === 'likeCount') {
        sortFieldForWhere = 'COUNT(DISTINCT likeReaction.id)';
      } else if (sortBy === 'dislikeCount') {
        sortFieldForWhere = 'COUNT(DISTINCT dislikeReaction.id)';
      } else if (sortBy === 'commentCount') {
        // commentCount still uses subquery
        sortFieldForWhere = `(SELECT COUNT(*) FROM post_comments WHERE post_id = post.id AND deleted_at IS NULL)`;
      } else {
        sortFieldForWhere = `post.${sortBy}`;
      }
    } else {
      sortFieldForWhere = `post.${sortBy}`;
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        if (sortValue !== null && sortValue !== undefined) {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere(
              `(${sortFieldForWhere} > :sortValue OR (${sortFieldForWhere} = :sortValue AND post.id > :cursorId))`,
              { sortValue, cursorId: id },
            );
          } else {
            queryBuilder.andWhere(
              `(${sortFieldForWhere} < :sortValue OR (${sortFieldForWhere} = :sortValue AND post.id < :cursorId))`,
              { sortValue, cursorId: id },
            );
          }
        } else {
          if (sortOrder === 'ASC') {
            queryBuilder.andWhere('post.id > :cursorId', { cursorId: id });
          } else {
            queryBuilder.andWhere('post.id < :cursorId', { cursorId: id });
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    // For ORDER BY: manually modify SQL to use alias names for computed fields
    // TypeORM's orderBy parser can't handle COUNT(DISTINCT ...) expressions
    if (isComputedField) {
      // Build query without ORDER BY first
      queryBuilder.take(realLimit + 1);

      // Get the SQL and parameters
      const [sql, parameters] = queryBuilder.getQueryAndParameters();

      // Add or replace ORDER BY to use the alias name (SQL supports this)
      const aliasOrderBy = `ORDER BY "${sortBy}" ${sortOrder}, "post_id" ${sortOrder}`;
      let modifiedSql = sql;
      if (sql.match(/ORDER BY/i)) {
        modifiedSql = sql.replace(/ORDER BY.*$/i, aliasOrderBy);
      } else {
        // Append ORDER BY if it doesn't exist
        modifiedSql = `${sql} ${aliasOrderBy}`;
      }

      // Execute the modified query
      const rawResults = await this.repository.manager.query(modifiedSql, parameters);

      if (rawResults.length === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      // Single pass: extract IDs and create result map
      const entityIds: string[] = [];
      const resultMap = new Map<string, Record<string, unknown>>();
      for (const row of rawResults) {
        const id = (row.post_id || row.postId || row.id) as string;
        if (id) {
          entityIds.push(id);
          resultMap.set(id, row);
        }
      }

      if (entityIds.length === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      // Fetch entities with relations (1 query)
      const entities = await this.repository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.userBadges', 'userBadges')
        .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
        .leftJoinAndSelect('post.admin', 'admin')
        .leftJoinAndSelect('post.category', 'category')
        .where('post.id IN (:...ids)', { ids: entityIds })
        .getMany();

      // Create entity map (1 loop)
      const entityMap = new Map(entities.map((e) => [e.id, e]));

      // Single pass: order entities and map computed fields
      const orderedEntities: Post[] = [];
      for (const id of entityIds) {
        const post = entityMap.get(id);
        if (post) {
          const rawData = resultMap.get(id);
          if (rawData) {
            (post as any).likeCount = parseInt(String(rawData.likeCount || '0'), 10);
            (post as any).dislikeCount = parseInt(
              String(rawData.dislikeCount || '0'),
              10,
            );
            (post as any).commentCount = parseInt(
              String(rawData.commentCount || '0'),
              10,
            );
            (post as any).viewCount = parseInt(String(rawData.viewCount || '0'), 10);
            // Map user reaction if userId is provided
            if (filters?.userId) {
              // PostgreSQL may return column names in lowercase when using raw queries
              const userReactionType = (rawData.userReactionType ||
                rawData.userreactiontype ||
                rawData['userReactionType'] ||
                rawData['userreactiontype']) as string | null;
              (post as any).reacted = userReactionType || null;
            }
          }
          orderedEntities.push(post);
        }
      }

      const hasMore = orderedEntities.length > realLimit;
      const data = orderedEntities.slice(0, realLimit);

      let nextCursor: string | null = null;
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        const rawData = resultMap.get(lastItem.id);
        const fieldValue = rawData
          ? (rawData[sortBy] as string | number | Date | null)
          : null;
        let sortValue: string | number | Date | null = null;
        if (fieldValue !== null && fieldValue !== undefined) {
          sortValue = fieldValue;
        }
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
      }

      return { data, nextCursor, hasMore };
    } else {
      // For regular fields, use TypeORM's orderBy
      if (sortOrder === 'DESC') {
        queryBuilder.addOrderBy(`post.${sortBy}`, 'DESC', 'NULLS LAST');
      } else {
        queryBuilder.orderBy(`post.${sortBy}`, 'ASC');
      }
      queryBuilder.addOrderBy('post.id', sortOrder);
      queryBuilder.take(realLimit + 1);
    }

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    const data = result.entities.slice(0, realLimit);

    // Create a map of post.id -> raw data to handle cases where GROUP BY creates multiple rows per post
    const rawDataMap = new Map<string, any>();
    result.raw.forEach((raw) => {
      const postId = raw.post_id || raw.postId || raw.post_id;
      if (postId && !rawDataMap.has(postId)) {
        rawDataMap.set(postId, raw);
      }
    });

    // Map likeCount, dislikeCount, commentCount, viewCount, and reacted from raw data to entities
    data.forEach((post) => {
      const rawData = rawDataMap.get(post.id);
      if (rawData) {
        (post as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
        (post as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
        (post as any).commentCount = parseInt(rawData?.commentCount || '0', 10);
        (post as any).viewCount = parseInt(rawData?.viewCount || '0', 10);
        // Map user reaction if userId is provided
        if (filters?.userId) {
          // PostgreSQL may return column names in lowercase when using raw queries
          const userReactionType = (rawData?.userReactionType ||
            rawData?.userreactiontype ||
            rawData?.['userReactionType'] ||
            rawData?.['userreactiontype']) as string | null;
          (post as any).reacted = userReactionType || null;
        }
      }
    });

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      // For computed fields, get value from raw data map
      let fieldValue: unknown;
      if (isComputedField) {
        const rawData = rawDataMap.get(lastItem.id);
        if (rawData && typeof rawData === 'object') {
          fieldValue = (rawData as Record<string, unknown>)[sortBy];
        }
      } else {
        fieldValue = (lastItem as unknown as Record<string, unknown>)[sortBy];
      }
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue as string | number | Date;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore };
  }

  async create(post: Partial<Post>): Promise<Post> {
    const entity = this.repository.create(post);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<Post>): Promise<Post> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.POST_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
