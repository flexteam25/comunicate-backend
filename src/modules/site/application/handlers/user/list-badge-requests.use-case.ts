import { Injectable, Inject } from '@nestjs/common';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { ISiteBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/site-badge-request.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListBadgeRequestsCommand {
  userId: string;
  siteId?: string;
  status?: SiteBadgeRequestStatus;
  siteName?: string;
  badgeName?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListBadgeRequestsUseCase {
  constructor(
    @Inject('ISiteBadgeRequestRepository')
    private readonly badgeRequestRepository: ISiteBadgeRequestRepository,
  ) {}

  async execute(
    command: ListBadgeRequestsCommand,
  ): Promise<CursorPaginationResult<SiteBadgeRequest>> {
    return this.badgeRequestRepository.findAllWithCursor(
      {
        userId: command.userId,
        siteId: command.siteId,
        status: command.status,
        siteName: command.siteName,
        badgeName: command.badgeName,
      },
      command.cursor,
      command.limit,
      'createdAt',
      'DESC',
    );
  }
}
