import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostComment } from '../../../domain/entities/post-comment.entity';
import { IPostCommentRepository } from '../repositories/post-comment.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class PostCommentRepository implements IPostCommentRepository {
  constructor(
    @InjectRepository(PostComment)
    private readonly repository: Repository<PostComment>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<PostComment | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      relations,
    });
  }

  async findByPostId(
    postId: string,
    parentCommentId?: string | null,
    cursor?: string,
    limit = 20,
    userId?: string,
  ): Promise<CursorPaginationResult<PostComment>> {
    const realLimit = limit > 50 ? 50 : limit;

    const queryBuilder = this.repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('comment.images', 'image')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'likeCount')
            .from('post_comment_reactions', 'reaction')
            .where('reaction.comment_id = comment.id')
            .andWhere("reaction.reaction_type = 'like'"),
        'likeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(reaction.id)', 'dislikeCount')
            .from('post_comment_reactions', 'reaction')
            .where('reaction.comment_id = comment.id')
            .andWhere("reaction.reaction_type = 'dislike'"),
        'dislikeCount',
      )
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.deletedAt IS NULL');

    if (parentCommentId === null || parentCommentId === undefined) {
      queryBuilder.andWhere('comment.parentCommentId IS NULL');
    } else {
      // Only load child comments if parent exists and is not deleted
      queryBuilder
        .innerJoin('post_comments', 'parent', 'parent.id = comment.parent_comment_id')
        .andWhere('comment.parentCommentId = :parentCommentId', {
          parentCommentId,
        })
        .andWhere('parent.deleted_at IS NULL');
    }

    // Join user's reaction if userId is provided
    if (userId) {
      queryBuilder
        .leftJoin(
          'post_comment_reactions',
          'userReaction',
          'userReaction.comment_id = comment.id AND userReaction.user_id = :userId',
          { userId },
        )
        .addSelect('userReaction.reaction_type', 'userReactionType');
    }

    if (cursor) {
      try {
        const { id } = CursorPaginationUtil.decodeCursor(cursor);
        queryBuilder.andWhere('comment.id < :cursorId', { cursorId: id });
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('comment.createdAt', 'DESC')
      .addOrderBy('comment.id', 'DESC')
      .take(realLimit + 1);

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    const data = result.entities.slice(0, realLimit);

    // Map likeCount, dislikeCount, and reacted from raw data to entities
    data.forEach((comment, index) => {
      const rawData = result.raw[index];
      (comment as any).likeCount = parseInt(rawData?.likeCount || '0', 10);
      (comment as any).dislikeCount = parseInt(rawData?.dislikeCount || '0', 10);
      // Map user reaction if userId is provided
      if (userId) {
        const userReactionType = (rawData?.userReactionType ||
          rawData?.userreactiontype ||
          rawData?.['userReactionType'] ||
          rawData?.['userreactiontype']) as string | null;
        (comment as any).reacted = userReactionType || null;
      }
    });

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, lastItem.createdAt);
    }

    return { data, nextCursor, hasMore };
  }

  async create(comment: Partial<PostComment>): Promise<PostComment> {
    const entity = this.repository.create(comment);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<PostComment>): Promise<PostComment> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('PostComment not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async deleteAllChildrenRecursive(
    parentCommentId: string,
    manager?: any,
  ): Promise<void> {
    // Use recursive CTE to find all descendant comments
    // Then soft delete them all
    const queryManager = manager || this.repository.manager;
    await queryManager.query(
      `
      WITH RECURSIVE comment_tree AS (
        -- Base case: direct children
        SELECT id, parent_comment_id
        FROM post_comments
        WHERE parent_comment_id = $1
          AND deleted_at IS NULL
        
        UNION ALL
        
        -- Recursive case: children of children
        SELECT c.id, c.parent_comment_id
        FROM post_comments c
        INNER JOIN comment_tree ct ON c.parent_comment_id = ct.id
        WHERE c.deleted_at IS NULL
      )
      UPDATE post_comments
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT id FROM comment_tree)
    `,
      [parentCommentId],
    );
  }

  async reparentChildrenToRoot(parentCommentId: string): Promise<void> {
    await this.repository.update(
      { parentCommentId },
      {
        parentCommentId: null,
      },
    );
  }
}
