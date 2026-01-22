import { Injectable, Inject } from '@nestjs/common';
import { SiteBadgeRequest } from '../../../domain/entities/site-badge-request.entity';
import { ISiteBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/site-badge-request.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface GetSiteBadgeRequestCommand {
  requestId: string;
}

@Injectable()
export class GetSiteBadgeRequestUseCase {
  constructor(
    @Inject('ISiteBadgeRequestRepository')
    private readonly badgeRequestRepository: ISiteBadgeRequestRepository,
  ) {}

  async execute(command: GetSiteBadgeRequestCommand): Promise<SiteBadgeRequest> {
    const request = await this.badgeRequestRepository.findById(command.requestId, [
      'site',
      'badge',
      'user',
      'admin',
      'images',
    ]);

    if (!request) {
      throw notFound(MessageKeys.SITE_BADGE_REQUEST_NOT_FOUND);
    }

    return request;
  }
}
