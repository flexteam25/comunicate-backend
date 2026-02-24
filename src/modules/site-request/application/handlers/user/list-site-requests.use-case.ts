import { Injectable, Inject } from '@nestjs/common';
import { ISiteRequestRepository } from '../../../infrastructure/persistence/repositories/site-request.repository';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';

export interface ListSiteRequestsCommand {
  userId: string;
  status?: SiteRequestStatus;
  cursor?: string;
  limit?: number;
}

export interface ListSiteRequestsResult {
  requests: SiteRequest[];
  nextCursor: string | null;
  prevCursor: string | null;
}

@Injectable()
export class ListSiteRequestsUseCase {
  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
  ) {}

  async execute(command: ListSiteRequestsCommand): Promise<ListSiteRequestsResult> {
    const result = await this.siteRequestRepository.findAll(
      {
        userId: command.userId,
        status: command.status,
      },
      command.cursor,
      command.limit || 20,
    );

    return {
      requests: result.data,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor ?? null,
    };
  }
}
