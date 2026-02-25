import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PartnerRequest,
  PartnerRequestStatus,
} from '../../../domain/entities/partner-request.entity';
import { IPartnerRequestRepository } from '../repositories/partner-request.repository';
import { UserRole } from '../../../../user/domain/entities/user-role.entity';
import { Role } from '../../../../user/domain/entities/role.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
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
    const filterKey = JSON.stringify({
      status: filters?.status ?? null,
      userId: filters?.userId ?? null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const queryBuilder = this.repository
      .createQueryBuilder('partner_request')
      .leftJoinAndSelect('partner_request.user', 'user')
      .leftJoinAndSelect('partner_request.admin', 'admin')
      .leftJoin(UserRole, 'user_role', 'user_role.userId = partner_request.userId')
      .leftJoin(Role, 'role', 'role.id = user_role.roleId AND role.deletedAt IS NULL')
      .where('partner_request.deletedAt IS NULL')
      .andWhere('(role.name IS NULL OR role.name != :partnerRole)', {
        partnerRole: 'partner',
      });

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

    queryBuilder
      .orderBy('partner_request.createdAt', 'DESC', 'NULLS LAST')
      .addOrderBy('partner_request.id', 'DESC')
      .skip(offset)
      .take(realLimit + 1);

    const entities = await queryBuilder.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return { data, nextCursor, prevCursor: prevCursor ?? null };
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
