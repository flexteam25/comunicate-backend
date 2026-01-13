import { Injectable, Inject } from '@nestjs/common';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { ISiteBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/site-badge-request.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListAllBadgeRequestsCommand {
  siteName?: string;
  badgeName?: string;
  status?: SiteBadgeRequestStatus;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListAllBadgeRequestsUseCase {
  constructor(
    @Inject('ISiteBadgeRequestRepository')
    private readonly badgeRequestRepository: ISiteBadgeRequestRepository,
  ) {}

  async execute(
    command: ListAllBadgeRequestsCommand,
  ): Promise<CursorPaginationResult<SiteBadgeRequest>> {
    return this.badgeRequestRepository.findAllWithCursor(
      {
        siteName: command.siteName,
        badgeName: command.badgeName,
        status: command.status,
      },
      command.cursor,
      command.limit,
      'createdAt',
      'DESC',
    );
  }
}
