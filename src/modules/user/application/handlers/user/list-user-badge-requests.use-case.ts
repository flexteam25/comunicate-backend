import { Injectable, Inject } from '@nestjs/common';
import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import { IUserBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/user-badge-request.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListUserBadgeRequestsCommand {
  userId: string;
  status?: UserBadgeRequestStatus;
  badgeName?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListUserBadgeRequestsUseCase {
  constructor(
    @Inject('IUserBadgeRequestRepository')
    private readonly badgeRequestRepository: IUserBadgeRequestRepository,
  ) {}

  async execute(
    command: ListUserBadgeRequestsCommand,
  ): Promise<CursorPaginationResult<UserBadgeRequest>> {
    return this.badgeRequestRepository.findAllWithCursor(
      {
        userId: command.userId,
        status: command.status,
        badgeName: command.badgeName,
      },
      command.cursor,
      command.limit,
      'createdAt',
      'DESC',
    );
  }
}
