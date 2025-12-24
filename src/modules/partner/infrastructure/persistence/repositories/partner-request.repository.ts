import {
  PartnerRequest,
  PartnerRequestStatus,
} from '../../../domain/entities/partner-request.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IPartnerRequestRepository {
  findById(id: string, relations?: string[]): Promise<PartnerRequest | null>;
  findByUserId(userId: string, relations?: string[]): Promise<PartnerRequest | null>;
  findByUserIdAndStatus(
    userId: string,
    status: PartnerRequestStatus,
  ): Promise<PartnerRequest | null>;
  findAll(
    filters?: {
      status?: PartnerRequestStatus;
      userId?: string;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<PartnerRequest>>;
  create(partnerRequest: Partial<PartnerRequest>): Promise<PartnerRequest>;
  update(id: string, data: Partial<PartnerRequest>): Promise<PartnerRequest>;
}
