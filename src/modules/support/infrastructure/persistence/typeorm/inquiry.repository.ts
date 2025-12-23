import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { IInquiryRepository, InquiryFilters } from '../repositories/inquiry.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class InquiryRepository implements IInquiryRepository {
  constructor(
    @InjectRepository(Inquiry)
    private readonly repository: Repository<Inquiry>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<Inquiry | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findAllWithCursor(
    filters?: InquiryFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<Inquiry>> {
    const queryBuilder = this.repository
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.user', 'user')
      .leftJoinAndSelect('inquiry.admin', 'admin')
      .where('inquiry.deletedAt IS NULL');

    // Apply filters
    if (filters?.userName) {
      queryBuilder.andWhere('LOWER(user.displayName) LIKE LOWER(:userName)', {
        userName: `%${filters.userName}%`,
      });
    }
    if (filters?.status) {
      queryBuilder.andWhere('inquiry.status = :status', {
        status: filters.status,
      });
    }
    if (filters?.category) {
      queryBuilder.andWhere('inquiry.category = :category', {
        category: filters.category,
      });
    }
    if (filters?.adminName) {
      queryBuilder.andWhere('LOWER(admin.displayName) LIKE LOWER(:adminName)', {
        adminName: `%${filters.adminName}%`,
      });
    }

    // Apply cursor pagination
    if (cursor) {
      const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
      const sortField = `inquiry.${sortBy}`;

      if (sortValue) {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND inquiry.id > :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND inquiry.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        }
      } else {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere('inquiry.id > :cursorId', { cursorId: id });
        } else {
          queryBuilder.andWhere('inquiry.id < :cursorId', { cursorId: id });
        }
      }
    }

    // Apply sorting
    queryBuilder.orderBy(`inquiry.${sortBy}`, sortOrder);
    queryBuilder.addOrderBy('inquiry.id', sortOrder);

    // Fetch one extra to check if there's more
    queryBuilder.take(limit + 1);

    const inquiries = await queryBuilder.getMany();

    // Check if there's more data
    const hasMore = inquiries.length > limit;
    const data = hasMore ? inquiries.slice(0, limit) : inquiries;

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

  async create(inquiry: Partial<Inquiry>): Promise<Inquiry> {
    const newInquiry = this.repository.create(inquiry);
    return this.repository.save(newInquiry);
  }

  async update(id: string, data: Partial<Inquiry>): Promise<Inquiry> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['user', 'admin']);
    if (!updated) {
      throw new Error('Inquiry not found after update');
    }
    return updated;
  }

  async findByUserId(userId: string): Promise<Inquiry[]> {
    return this.repository.find({
      where: { userId, deletedAt: null },
      relations: ['user', 'admin'],
      order: { createdAt: 'DESC' },
    });
  }
}
