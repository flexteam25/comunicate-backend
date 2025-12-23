import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../../domain/entities/post.entity';
import { IPostRepository } from '../repositories/post.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class PostRepository implements IPostRepository {
  constructor(
    @InjectRepository(Post)
    private readonly repository: Repository<Post>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Post | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      relations,
    });
  }

  async findByIdWithAggregates(id: string): Promise<Post | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
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
        `(SELECT COUNT(*) FROM post_comments WHERE post_id = post.id)`,
        'commentCount',
      )
      .where('post.deletedAt IS NULL')
      .andWhere('post.id = :id', { id });

    const result = await queryBuilder.getRawAndEntities();
    if (result.entities.length === 0) {
      return null;
    }

    const post = result.entities[0];
    const rawData = result.raw[0];
    (post as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
    (post as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
    (post as any).commentCount = parseInt(rawData?.commentCount || '0', 10);

    return post;
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
      .leftJoinAndSelect('post.admin', 'admin')
      .leftJoinAndSelect('post.category', 'category')
      .where('post.deletedAt IS NULL');

    if (filters?.isPublished !== undefined) {
      queryBuilder.andWhere('post.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    if (filters?.categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('post.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere('LOWER(post.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
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

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = (lastItem as unknown as Record<string, unknown>)[
        sortBy
      ];
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
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<Post>> {
    const realLimit = limit > 50 ? 50 : limit;
    const sortBy = filters?.sortBy || 'publishedAt';
    const sortOrder = filters?.sortOrder || 'DESC';

    const queryBuilder = this.repository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
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
        `(SELECT COUNT(*) FROM post_comments WHERE post_id = post.id)`,
        'commentCount',
      )
      .where('post.deletedAt IS NULL')
      .andWhere('post.isPublished = :isPublished', { isPublished: true });

    if (filters?.categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere('LOWER(post.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
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

    // Map likeCount, dislikeCount, and commentCount from raw data to entities
    data.forEach((post, index) => {
      const rawData = result.raw[index];
      (post as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
      (post as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
      (post as any).commentCount = parseInt(rawData?.commentCount || '0', 10);
    });

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = (lastItem as unknown as Record<string, unknown>)[
        sortBy
      ];
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
      throw new Error('Post not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
