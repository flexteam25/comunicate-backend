import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PartnerRequest,
  PartnerRequestStatus,
} from '../../../domain/entities/partner-request.entity';
import { IPartnerRequestRepository } from '../repositories/partner-request.repository';
import {
  CursorPaginationResult,
  CursorPaginationUtil,
} from '../../../../../shared/utils/cursor-pagination.util';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class PartnerRequestRepository implements IPartnerRequestRepository {
  constructor(
    @InjectRepository(PartnerRequest)
    private readonly repository: Repository<PartnerRequest>,
  ) {}

  async findById(id: string, relations?: string[]): Promise<PartnerRequest | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      relations,
    });
  }

  async findByUserId(
    userId: string,
    relations?: string[],
  ): Promise<PartnerRequest | null> {
    return this.repository.findOne({
      where: { userId, deletedAt: null },
      relations,
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserIdAndStatus(
    userId: string,
    status: PartnerRequestStatus,
  ): Promise<PartnerRequest | null> {
    return this.repository.findOne({
      where: { userId, status, deletedAt: null },
    });
  }

  async findAll(
    filters?: {
      status?: PartnerRequestStatus;
      userId?: string;
    },
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginationResult<PartnerRequest>> {
    const realLimit = limit > 100 ? 100 : limit;

    const queryBuilder = this.repository
      .createQueryBuilder('partner_request')
      .leftJoinAndSelect('partner_request.user', 'user')
      .leftJoinAndSelect('partner_request.admin', 'admin')
      .where('partner_request.deletedAt IS NULL');

    if (filters?.status) {
      queryBuilder.andWhere('partner_request.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('partner_request.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (cursor) {
      try {
        const { id, sortValue } = CursorPaginationUtil.decodeCursor(cursor);
        const sortField = 'partner_request.createdAt';
        if (sortValue !== null && sortValue !== undefined) {
          queryBuilder.andWhere(
            `(${sortField} < :sortValue OR (${sortField} = :sortValue AND partner_request.id < :cursorId))`,
            { sortValue, cursorId: id },
          );
        } else {
          queryBuilder.andWhere('partner_request.id < :cursorId', { cursorId: id });
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    queryBuilder
      .orderBy('partner_request.createdAt', 'DESC', 'NULLS LAST')
      .addOrderBy('partner_request.id', 'DESC')
      .take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const fieldValue = lastItem.createdAt;
      let sortValue: string | number | Date | null = null;
      if (fieldValue !== null && fieldValue !== undefined) {
        sortValue = fieldValue;
      }
      nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, sortValue);
    }

    return { data, nextCursor, hasMore };
  }

  async create(partnerRequest: Partial<PartnerRequest>): Promise<PartnerRequest> {
    const entity = this.repository.create(partnerRequest);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<PartnerRequest>): Promise<PartnerRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.PARTNER_REQUEST_NOT_FOUND_AFTER_UPDATE);
    }
    return updated;
  }
}
