import { Injectable, Inject } from '@nestjs/common';
import { IPartnerRequestRepository } from '../../../infrastructure/persistence/repositories/partner-request.repository';
import { PartnerRequestStatus } from '../../../domain/entities/partner-request.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListPartnerRequestsCommand {
  status?: PartnerRequestStatus;
  userId?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListPartnerRequestsUseCase {
  constructor(
    @Inject('IPartnerRequestRepository')
    private readonly partnerRequestRepository: IPartnerRequestRepository,
  ) {}

  async execute(
    command: ListPartnerRequestsCommand,
  ): Promise<CursorPaginationResult<any>> {
    return this.partnerRequestRepository.findAll(
      {
        status: command.status,
        userId: command.userId,
      },
      command.cursor,
      command.limit,
    );
  }
}
