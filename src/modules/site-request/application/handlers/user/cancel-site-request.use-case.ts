import {
  Injectable,
  Inject,
} from '@nestjs/common';
import { ISiteRequestRepository } from '../../../infrastructure/persistence/repositories/site-request.repository';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';
import {
  notFound,
  badRequest,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CancelSiteRequestCommand {
  requestId: string;
  userId: string;
}

@Injectable()
export class CancelSiteRequestUseCase {
  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
  ) {}

  async execute(command: CancelSiteRequestCommand): Promise<SiteRequest> {
    const request = await this.siteRequestRepository.findById(command.requestId, [
      'user',
      'category',
      'tier',
      'site',
      'admin',
    ]);

    if (!request) {
      throw notFound(MessageKeys.SITE_REQUEST_NOT_FOUND);
    }

    // Check ownership
    if (request.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_CANCEL_OWN_SITE_REQUESTS);
    }

    // Only allow cancel if status is pending
    if (request.status !== SiteRequestStatus.PENDING) {
      throw badRequest(MessageKeys.CAN_ONLY_CANCEL_PENDING_SITE_REQUESTS);
    }

    // Update status to cancelled
    await this.siteRequestRepository.update(command.requestId, {
      status: SiteRequestStatus.CANCELLED,
    });

    // Return the request with updated status and loaded relations
    request.status = SiteRequestStatus.CANCELLED;
    return request;
  }
}
