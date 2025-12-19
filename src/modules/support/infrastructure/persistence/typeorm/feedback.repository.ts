import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../../../domain/entities/feedback.entity';
import {
  IFeedbackRepository,
  FeedbackFilters,
} from '../repositories/feedback.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class FeedbackRepository implements IFeedbackRepository {
  constructor(
    @InjectRepository(Feedback)
    private readonly repository: Repository<Feedback>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Feedback | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findAllWithCursor(
    filters?: FeedbackFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<Feedback>> {
    const queryBuilder = this.repository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.viewedByAdmin', 'viewedByAdmin')
      .where('feedback.deletedAt IS NULL');

    // Apply filters
    if (filters?.userId) {
      queryBuilder.andWhere('feedback.userId = :userId', {
        userId: filters.userId,
      });
    }
    if (filters?.isViewed !== undefined) {
      queryBuilder.andWhere('feedback.isViewed = :isViewed', {
        isViewed: filters.isViewed,
      });
    }

    // Apply cursor pagination
    if (cursor) {
      const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
      const sortField = `feedback.${sortBy}`;

      if (sortValue) {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND feedback.id > :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND feedback.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        }
      } else {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere('feedback.id > :cursorId', { cursorId: id });
        } else {
          queryBuilder.andWhere('feedback.id < :cursorId', { cursorId: id });
        }
      }
    }

    // Apply sorting
    queryBuilder.orderBy(`feedback.${sortBy}`, sortOrder);
    queryBuilder.addOrderBy('feedback.id', sortOrder);

    // Fetch one extra to check if there's more
    queryBuilder.take(limit + 1);

    const feedbacks = await queryBuilder.getMany();

    // Check if there's more data
    const hasMore = feedbacks.length > limit;
    const data = hasMore ? feedbacks.slice(0, limit) : feedbacks;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const sortValue = (lastItem as any)[sortBy];
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async create(feedback: Partial<Feedback>): Promise<Feedback> {
    const newFeedback = this.repository.create(feedback);
    return this.repository.save(newFeedback);
  }

  async update(id: string, data: Partial<Feedback>): Promise<Feedback> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['user', 'viewedByAdmin']);
    if (!updated) {
      throw new Error('Feedback not found after update');
    }
    return updated;
  }

  async findByUserId(userId: string): Promise<Feedback[]> {
    return this.repository.find({
      where: { userId, deletedAt: null },
      relations: ['user', 'viewedByAdmin'],
      order: { createdAt: 'DESC' },
    });
  }
}
