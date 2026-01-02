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
  ): Promise<CursorPaginationResult<PostComment>> {
    const realLimit = limit > 50 ? 50 : limit;

    const queryBuilder = this.repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('user.userBadges', 'userBadges')
      .leftJoinAndSelect('userBadges.badge', 'badge', 'badge.deletedAt IS NULL')
      .leftJoinAndSelect('comment.images', 'image')
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

    if (cursor) {
      try {
        const { id } = CursorPaginationUtil.decodeCursor(cursor);
        queryBuilder.andWhere('comment.id < :cursorId', { cursorId: id });
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('comment.createdAt', 'ASC')
      .addOrderBy('comment.id', 'ASC')
      .take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

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

  async reparentChildrenToRoot(parentCommentId: string): Promise<void> {
    await this.repository.update(
      { parentCommentId },
      {
        parentCommentId: null,
      },
    );
  }
}
