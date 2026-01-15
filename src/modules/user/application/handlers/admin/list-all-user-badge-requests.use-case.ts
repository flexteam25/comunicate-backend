import { Injectable, Inject } from '@nestjs/common';
import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import { IUserBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/user-badge-request.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListAllUserBadgeRequestsCommand {
  status?: UserBadgeRequestStatus;
  userName?: string;
  badgeName?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListAllUserBadgeRequestsUseCase {
  constructor(
    @Inject('IUserBadgeRequestRepository')
    private readonly badgeRequestRepository: IUserBadgeRequestRepository,
  ) {}

  async execute(
    command: ListAllUserBadgeRequestsCommand,
  ): Promise<CursorPaginationResult<UserBadgeRequest>> {
    return this.badgeRequestRepository.findAllWithCursor(
      {
        status: command.status,
        userName: command.userName,
        badgeName: command.badgeName,
      },
      command.cursor,
      command.limit,
      'createdAt',
      'DESC',
    );
  }
}
