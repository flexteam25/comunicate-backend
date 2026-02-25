import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry, InquiryStatus } from '../../../domain/entities/inquiry.entity';
import { IInquiryRepository, InquiryFilters } from '../repositories/inquiry.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
    const realLimit = limit > 50 ? 50 : limit;
    const filterKey = JSON.stringify({
      ...(filters || {}),
      sortBy,
      sortOrder,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.user', 'user')
      .leftJoinAndSelect('inquiry.admin', 'admin')
      .where('inquiry.deletedAt IS NULL');

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

    queryBuilder
      .orderBy(`inquiry.${sortBy}`, sortOrder)
      .addOrderBy('inquiry.id', sortOrder)
      .skip(offset)
      .take(realLimit + 1);

    const inquiries = await queryBuilder.getMany();
    const hasMore = inquiries.length > realLimit;
    const data = inquiries.slice(0, realLimit);

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

  async create(inquiry: Partial<Inquiry>): Promise<Inquiry> {
    const newInquiry = this.repository.create(inquiry);
    return this.repository.save(newInquiry);
  }

  async update(id: string, data: Partial<Inquiry>): Promise<Inquiry> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['user', 'admin']);
    if (!updated) {
      throw notFound(MessageKeys.INQUIRY_NOT_FOUND_AFTER_UPDATE);
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
