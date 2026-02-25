import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostComment } from '../../../domain/entities/post-comment.entity';
import { IPostCommentRepository } from '../repositories/post-comment.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
    const sortOrder = 'DESC' as const;
    const filterKey = JSON.stringify({
      postId,
      parentCommentId: parentCommentId ?? null,
      userId: userId ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

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
      queryBuilder
        .innerJoin('post_comments', 'parent', 'parent.id = comment.parent_comment_id')
        .andWhere('comment.parentCommentId = :parentCommentId', {
          parentCommentId,
        })
        .andWhere('parent.deleted_at IS NULL');
    }

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

    queryBuilder
      .orderBy('comment.createdAt', sortOrder)
      .addOrderBy('comment.id', sortOrder)
      .skip(offset)
      .take(realLimit + 1);

    const result = await queryBuilder.getRawAndEntities();
    const hasMore = result.entities.length > realLimit;
    const data = result.entities.slice(0, realLimit);

    const rawDataMap = new Map<string, Record<string, unknown>>();
    result.raw.forEach((raw: Record<string, unknown>) => {
      const commentId =
        (raw.comment_id as string) ||
        (raw.commentId as string) ||
        (raw['comment_id'] as string) ||
        (raw['commentId'] as string);
      if (commentId && !rawDataMap.has(commentId)) {
        rawDataMap.set(commentId, raw);
      }
    });

    data.forEach((comment) => {
      const rawData = rawDataMap.get(comment.id);
      if (rawData) {
        (comment as any).likeCount = parseInt(
          String(rawData.likeCount || rawData.likeCount || '0'),
          10,
        );
        (comment as any).dislikeCount = parseInt(
          String(rawData.dislikeCount || rawData.dislikeCount || '0'),
          10,
        );
        if (userId) {
          const userReactionType = (rawData.userReactionType ||
            rawData.userreactiontype ||
            rawData['userReactionType'] ||
            rawData['userreactiontype']) as string | null;
          (comment as any).reacted = userReactionType || null;
        }
      } else {
        (comment as any).likeCount = 0;
        (comment as any).dislikeCount = 0;
        if (userId) {
          (comment as any).reacted = null;
        }
      }
    });

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return { data, nextCursor, prevCursor: prevCursor ?? null };
  }

  async create(comment: Partial<PostComment>): Promise<PostComment> {
    const entity = this.repository.create(comment);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<PostComment>): Promise<PostComment> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.POST_COMMENT_NOT_FOUND_AFTER_UPDATE);
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
