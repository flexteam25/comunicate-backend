import { Injectable, Inject } from '@nestjs/common';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { ISiteBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/site-badge-request.repository';
import {
  notFound,
  badRequest,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CancelBadgeRequestCommand {
  userId: string;
  requestId: string;
}

@Injectable()
export class CancelBadgeRequestUseCase {
  constructor(
    @Inject('ISiteBadgeRequestRepository')
    private readonly badgeRequestRepository: ISiteBadgeRequestRepository,
  ) {}

  async execute(command: CancelBadgeRequestCommand): Promise<SiteBadgeRequest> {
    const request = await this.badgeRequestRepository.findById(command.requestId, [
      'site',
      'badge',
      'user',
    ]);

    if (!request) {
      throw notFound(MessageKeys.SITE_BADGE_REQUEST_NOT_FOUND);
    }

    // Check if user owns this request
    if (request.userId !== command.userId) {
      throw forbidden(MessageKeys.PERMISSION_DENIED);
    }

    // Check if request is pending
    if (request.status !== SiteBadgeRequestStatus.PENDING) {
      throw badRequest(MessageKeys.CAN_ONLY_CANCEL_PENDING_BADGE_REQUEST);
    }

    // Update status to cancelled
    const updated = await this.badgeRequestRepository.update(command.requestId, {
      status: SiteBadgeRequestStatus.CANCELLED,
    });

    return updated;
  }
}
