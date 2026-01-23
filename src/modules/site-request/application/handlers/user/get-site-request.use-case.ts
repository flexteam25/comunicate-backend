import {
  Injectable,
  Inject,
} from '@nestjs/common';
import { ISiteRequestRepository } from '../../../infrastructure/persistence/repositories/site-request.repository';
import { SiteRequest } from '../../../domain/entities/site-request.entity';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface GetSiteRequestCommand {
  requestId: string;
  userId?: string; // Optional for admin
}

@Injectable()
export class GetSiteRequestUseCase {
  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
  ) {}

  async execute(command: GetSiteRequestCommand): Promise<SiteRequest> {
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

    // If userId is provided (user request), check ownership
    if (command.userId && request.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_VIEW_OWN_SITE_REQUESTS);
    }

    return request;
  }
}
