import { Injectable, Inject } from '@nestjs/common';
import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import { IUserBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/user-badge-request.repository';
import {
  notFound,
  badRequest,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CancelUserBadgeRequestCommand {
  userId: string;
  requestId: string;
}

@Injectable()
export class CancelUserBadgeRequestUseCase {
  constructor(
    @Inject('IUserBadgeRequestRepository')
    private readonly badgeRequestRepository: IUserBadgeRequestRepository,
  ) {}

  async execute(command: CancelUserBadgeRequestCommand): Promise<UserBadgeRequest> {
    const request = await this.badgeRequestRepository.findById(command.requestId, [
      'user',
      'badge',
      'images',
    ]);

    if (!request) {
      throw notFound(MessageKeys.USER_BADGE_REQUEST_NOT_FOUND);
    }

    // Check if user owns this request
    if (request.userId !== command.userId) {
      throw forbidden(MessageKeys.PERMISSION_DENIED);
    }

    // Check if request is pending
    if (request.status !== UserBadgeRequestStatus.PENDING) {
      throw badRequest(MessageKeys.CAN_ONLY_CANCEL_PENDING_BADGE_REQUEST);
    }

    // Update status to cancelled
    const updated = await this.badgeRequestRepository.update(command.requestId, {
      status: UserBadgeRequestStatus.CANCELLED,
    });

    return updated;
  }
}
