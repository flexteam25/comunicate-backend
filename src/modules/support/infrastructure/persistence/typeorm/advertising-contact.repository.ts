import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvertisingContact } from '../../../domain/entities/advertising-contact.entity';
import {
  IAdvertisingContactRepository,
  AdvertisingContactFilters,
} from '../repositories/advertising-contact.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';

@Injectable()
export class AdvertisingContactRepository implements IAdvertisingContactRepository {
  constructor(
    @InjectRepository(AdvertisingContact)
    private readonly repository: Repository<AdvertisingContact>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<AdvertisingContact | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findAllWithCursor(
    filters?: AdvertisingContactFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginationResult<AdvertisingContact>> {
    const queryBuilder = this.repository
      .createQueryBuilder('advertisingContact')
      .leftJoinAndSelect('advertisingContact.user', 'user')
      .leftJoinAndSelect('advertisingContact.viewedByAdmin', 'viewedByAdmin')
      .where('advertisingContact.deletedAt IS NULL');

    // Apply filters
    if (filters?.userId) {
      queryBuilder.andWhere('advertisingContact.userId = :userId', {
        userId: filters.userId,
      });
    }
    if (filters?.isViewed !== undefined) {
      queryBuilder.andWhere('advertisingContact.isViewed = :isViewed', {
        isViewed: filters.isViewed,
      });
    }

    // Apply cursor pagination
    if (cursor) {
      const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
      const sortField = `advertisingContact.${sortBy}`;

      if (sortValue) {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere(
            `(${sortField} > :sortValue OR (${sortField} = :sortValue AND advertisingContact.id > :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND advertisingContact.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        }
      } else {
        if (sortOrder === 'ASC') {
          queryBuilder.andWhere('advertisingContact.id > :cursorId', { cursorId: id });
        } else {
          queryBuilder.andWhere('advertisingContact.id < :cursorId', { cursorId: id });
        }
      }
    }

    // Apply sorting
    queryBuilder.orderBy(`advertisingContact.${sortBy}`, sortOrder);
    queryBuilder.addOrderBy('advertisingContact.id', sortOrder);

    // Fetch one extra to check if there's more
    queryBuilder.take(limit + 1);

    const advertisingContacts: AdvertisingContact[] = await queryBuilder.getMany();

    // Check if there's more data
    const hasMore = advertisingContacts.length > limit;
    const data = hasMore ? advertisingContacts.slice(0, limit) : advertisingContacts;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem: AdvertisingContact = data[data.length - 1];
      const sortValue = (lastItem as unknown as Record<string, unknown>)[sortBy] as
        | string
        | number
        | Date
        | undefined;
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async create(
    advertisingContact: Partial<AdvertisingContact>,
  ): Promise<AdvertisingContact> {
    const newAdvertisingContact = this.repository.create(advertisingContact);
    return this.repository.save(newAdvertisingContact);
  }

  async update(
    id: string,
    data: Partial<AdvertisingContact>,
  ): Promise<AdvertisingContact> {
    await this.repository.update(id, data);
    const updated = await this.findById(id, ['user', 'viewedByAdmin']);
    if (!updated) {
      throw new Error('AdvertisingContact not found after update');
    }
    return updated;
  }

  async findByUserId(userId: string): Promise<AdvertisingContact[]> {
    return this.repository.find({
      where: { userId, deletedAt: null },
      relations: ['user', 'viewedByAdmin'],
      order: { createdAt: 'DESC' },
    });
  }
}
